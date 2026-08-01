    <?php
    /**
     * Bills Controller
     */

    function handleBillsRoute($parts, $method) {
        $user = getAuthenticatedUser();
        
        $action = $parts[1] ?? '';
        
        // GET /bills/status/pending
        if ($action === 'status') {
            $subAction = $parts[2] ?? '';
            if ($subAction === 'pending' && $method === 'GET') {
                getPendingBills();
                return;
            }
        }
        
        // GET /bills/shop/:shopId
        if ($action === 'shop') {
            $shopId = $parts[2] ?? '';
            if (is_numeric($shopId) && $method === 'GET') {
                getBillsByShopId((int)$shopId);
                return;
            }
        }
        
        // GET /bills or POST /bills
        if (empty($action)) {
            if ($method === 'GET') {
                getBillsList();
            } elseif ($method === 'POST') {
                createBill($user['id']);
            } else {
                sendResponse(false, 'Method not allowed', null, 405);
            }
            return;
        }
        
        // Bill details by numeric ID
        if (is_numeric($action)) {
            $billId = (int)$action;
            $subAction = $parts[2] ?? '';
            
            if (empty($subAction)) {
                if ($method === 'GET') {
                    getBillById($billId);
                } elseif ($method === 'PUT') {
                    updateBill($billId);
                } elseif ($method === 'DELETE') {
                    deleteBill($billId);
                } else {
                    sendResponse(false, 'Method not allowed', null, 405);
                }
            } elseif ($subAction === 'signature' && $method === 'PATCH') {
                updateBillSignature($billId);
            } else {
                sendResponse(false, 'Action not found', null, 404);
            }
            return;
        }
        
        sendResponse(false, 'Action not found in bills', null, 404);
    }

    /**
     * Generate a unique bill number
     */
    function generateBillNumber($db) {
        $prefix = 'BILL' . date('Ymd');
        
        // Find the latest bill number generated for today by checking the prefix
        $stmt = $db->prepare("SELECT bill_number FROM bills WHERE bill_number LIKE :prefix ORDER BY bill_number DESC LIMIT 1");
        $stmt->execute(['prefix' => $prefix . '%']);
        $latestBill = $stmt->fetchColumn();
        
        if ($latestBill) {
            $sequenceStr = substr($latestBill, strlen($prefix));
            $sequence = (int)$sequenceStr;
            $nextSequence = $sequence + 1;
        } else {
            $nextSequence = 1;
        }
        
        $sequence = str_pad($nextSequence, 4, '0', STR_PAD_LEFT);
        return $prefix . $sequence;
    }

    /**
     * Map PDO row bill to nested structure
     */
    function formatBillRecord($db, $billRow) {
        if (!$billRow) return null;
        
        $billId = (int)$billRow['id'];
        
        // Fetch Shop
        $stmt = $db->prepare("SELECT id, shop_name as shopName, address, contact, email, gst_number as gstNumber, status, createdAt, updatedAt FROM shops WHERE id = :id");
        $stmt->execute(['id' => $billRow['shop_id']]);
        $shop = $stmt->fetch();
        if ($shop) {
            $shop['id'] = (int)$shop['id'];
        }
        
        // Fetch User
        $stmt = $db->prepare("SELECT id, name, email FROM users WHERE id = :id");
        $stmt->execute(['id' => $billRow['user_id']]);
        $user = $stmt->fetch();
        if ($user) {
            $user['id'] = (int)$user['id'];
        }
        
        // Fetch Bill Items with Product details
        $stmt = $db->prepare("SELECT bi.id, bi.bill_id as billId, bi.product_id as productId, bi.quantity, bi.rate, bi.amount, bi.sgst, bi.cgst, bi.hsn_code as hsnCode, bi.createdAt,
                                    p.product_name as productName, p.unit, p.hsn_code as p_hsnCode, p.gst as p_gst, p.price as p_price
                            FROM bill_items bi
                            JOIN products p ON bi.product_id = p.id
                            WHERE bi.bill_id = :bill_id");
        $stmt->execute(['bill_id' => $billId]);
        $items = $stmt->fetchAll();
        
        $formattedItems = [];
        foreach ($items as $item) {
            $formattedItems[] = [
                'id' => (int)$item['id'],
                'billId' => (int)$item['billId'],
                'productId' => (int)$item['productId'],
                'quantity' => (float)$item['quantity'],
                'rate' => (float)$item['rate'],
                'amount' => (float)$item['amount'],
                'sgst' => (float)$item['sgst'],
                'cgst' => (float)$item['cgst'],
                'hsnCode' => $item['hsnCode'],
                'createdAt' => $item['createdAt'],
                'product' => [
                    'id' => (int)$item['productId'],
                    'productName' => $item['productName'],
                    'unit' => $item['unit'],
                    'hsnCode' => $item['p_hsnCode'],
                    'gst' => (float)$item['p_gst'],
                    'price' => (float)$item['p_price']
                ]
            ];
        }
        
        return [
            'id' => $billId,
            'billNumber' => $billRow['bill_number'],
            'shopId' => (int)$billRow['shop_id'],
            'userId' => (int)$billRow['user_id'],
            'billDate' => $billRow['bill_date'],
            'totalAmount' => (float)$billRow['total_amount'],
            'receivedAmount' => (float)$billRow['received_amount'],
            'pendingAmount' => (float)$billRow['pending_amount'],
            'status' => $billRow['status'],
            'notes' => $billRow['notes'],
            'payment_mode' => $billRow['payment_mode'] ?? null,
            'signature' => $billRow['signature'],
            'createdAt' => $billRow['createdAt'],
            'updatedAt' => $billRow['updatedAt'],
            'shop' => $shop,
            'user' => $user,
            'billItems' => $formattedItems
        ];
    }

    /**
     * Handle GET /api/bills
     */
    function getBillsList() {
        $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
        $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 10;
        $search = isset($_GET['search']) ? $_GET['search'] : '';
        $sortBy = isset($_GET['sortBy']) ? $_GET['sortBy'] : 'createdAt';
        $sortOrder = isset($_GET['sortOrder']) && strtolower($_GET['sortOrder']) === 'asc' ? 'asc' : 'desc';
        
        $sortFieldMap = [
            'id' => 'b.id',
            'billNumber' => 'b.bill_number',
            'billDate' => 'b.bill_date',
            'totalAmount' => 'b.total_amount',
            'receivedAmount' => 'b.received_amount',
            'pendingAmount' => 'b.pending_amount',
            'status' => 'b.status',
            'createdAt' => 'b.createdAt',
            'updatedAt' => 'b.updatedAt',
            'shopName' => 's.shop_name'
        ];
        $sortBySql = $sortFieldMap[$sortBy] ?? 'b.createdAt';
        
        $offset = ($page - 1) * $limit;
        
        $db = getDatabaseConnection();
        try {
            $whereSql = "";
            $params = [];
            
            if ($search !== '') {
                $whereSql = "WHERE b.bill_number LIKE :search1 OR s.shop_name LIKE :search2 OR b.notes LIKE :search3";
                $params['search1'] = '%' . $search . '%';
                $params['search2'] = '%' . $search . '%';
                $params['search3'] = '%' . $search . '%';
            }
            
            // Count total
            $countStmt = $db->prepare("SELECT COUNT(*) FROM bills b JOIN shops s ON b.shop_id = s.id {$whereSql}");
            $countStmt->execute($params);
            $total = (int)$countStmt->fetchColumn();
            
            // Fetch bills
            $querySql = "SELECT b.* FROM bills b
                        JOIN shops s ON b.shop_id = s.id
                        {$whereSql}
                        ORDER BY {$sortBySql} {$sortOrder}
                        LIMIT :limit OFFSET :offset";
                        
            $stmt = $db->prepare($querySql);
            $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
            $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
            foreach ($params as $key => $val) {
                $stmt->bindValue(':' . $key, $val);
            }
            $stmt->execute();
            $billRows = $stmt->fetchAll();
            
            $bills = [];
            foreach ($billRows as $row) {
                $bills[] = formatBillRecord($db, $row);
            }
            
            $totalPages = ceil($total / $limit);
            
            echo json_encode([
                'success' => true,
                'data' => $bills,
                'pagination' => [
                    'page' => $page,
                    'limit' => $limit,
                    'total' => $total,
                    'totalPages' => $totalPages,
                    'hasNext' => $page < $totalPages,
                    'hasPrev' => $page > 1
                ]
            ]);
            exit;
        } catch (PDOException $e) {
            sendResponse(false, 'Database error: ' . $e->getMessage(), null, 500);
        }
    }

    /**
     * Handle GET /api/bills/:id
     */
    function getBillById($billId) {
        $db = getDatabaseConnection();
        try {
            $stmt = $db->prepare("SELECT * FROM bills WHERE id = :id LIMIT 1");
            $stmt->execute(['id' => $billId]);
            $row = $stmt->fetch();
            
            if (!$row) {
                sendResponse(false, 'Bill not found', null, 404);
            }
            
            $bill = formatBillRecord($db, $row);
            sendResponse(true, '', $bill);
        } catch (PDOException $e) {
            sendResponse(false, 'Database error: ' . $e->getMessage(), null, 500);
        }
    }

    /**
     * Handle POST /api/bills
     */
    function createBill($userId) {
        $body = getJsonInput();
        $shopId = isset($body['shopId']) ? (int)$body['shopId'] : 0;
        $billDateVal = $body['billDate'] ?? null;
        $receivedAmount = isset($body['receivedAmount']) ? round((float)$body['receivedAmount'], 2) : 0.00;
        $applyToPending = isset($body['applyToPending']) && $body['applyToPending'] === true;
        $notes = $body['notes'] ?? null;
        $paymentMode = $body['paymentMode'] ?? null;
        $items = $body['items'] ?? [];
        
        if ($shopId <= 0) {
            sendResponse(false, 'Shop ID is required', null, 400);
        }
        
        $billDate = $billDateVal ? date('Y-m-d H:i:s', strtotime($billDateVal)) : date('Y-m-d H:i:s');
        
        $db = getDatabaseConnection();
        try {
            $db->beginTransaction();
            
            // Check if shop exists
            $stmt = $db->prepare("SELECT id FROM shops WHERE id = :id LIMIT 1");
            $stmt->execute(['id' => $shopId]);
            if (!$stmt->fetch()) {
                $db->rollBack();
                sendResponse(false, 'Shop not found', null, 404);
            }
            
            // Generate bill number
            $billNumber = generateBillNumber($db);
            
            // Gather HSN codes for products
            $productMap = [];
            if (!empty($items)) {
                $productIds = array_map(function($item) { return (int)$item['productId']; }, $items);
                $productIdsStr = implode(',', $productIds);
                $stmt = $db->query("SELECT id, hsn_code FROM products WHERE id IN ({$productIdsStr})");
                while ($row = $stmt->fetch()) {
                    $productMap[(int)$row['id']] = $row['hsn_code'];
                }
            }
            
            // Calculate totals and format items
            $totalAmount = 0;
            $billItems = [];
            foreach ($items as $item) {
                $prodId = (int)$item['productId'];
                $qty = (float)$item['quantity'];
                $rate = (float)$item['rate'];
                $sgst = isset($item['sgst']) ? (float)$item['sgst'] : 0.0;
                $cgst = isset($item['cgst']) ? (float)$item['cgst'] : 0.0;
                
                $amount = round($qty * $rate, 2);
                $totalAmount += $amount + $sgst + $cgst;
                
                $billItems[] = [
                    'productId' => $prodId,
                    'quantity' => $qty,
                    'rate' => $rate,
                    'amount' => $amount,
                    'sgst' => $sgst,
                    'cgst' => $cgst,
                    'hsnCode' => $item['hsnCode'] ?? ($productMap[$prodId] ?? '')
                ];
            }
            
            $isPaymentBill = empty($items) && $receivedAmount > 0;
            $shouldApplyToPending = $isPaymentBill && $applyToPending;
            
            $billReceivedAmount = $receivedAmount;
            $excessPayment = 0;
            if ($receivedAmount > $totalAmount && !$isPaymentBill) {
                $excessPayment = round($receivedAmount - $totalAmount, 2);
                $billReceivedAmount = $totalAmount;
            }
            
            $pendingAmount = round($totalAmount - $billReceivedAmount, 2);
            // If remaining pending amount is less than 1.00 Rupee, clear it completely
            if ($pendingAmount > 0 && $pendingAmount < 1.00) {
                $billReceivedAmount = $totalAmount;
                $pendingAmount = 0.0;
            }
            $status = $pendingAmount <= 0 ? 'COMPLETED' : 'PENDING';
            
            // Insert Bill
            $stmt = $db->prepare("INSERT INTO bills (bill_number, shop_id, user_id, bill_date, total_amount, received_amount, pending_amount, status, notes, payment_mode, createdAt, updatedAt) 
                                VALUES (:bill_number, :shop_id, :user_id, :bill_date, :total_amount, :received_amount, :pending_amount, :status, :notes, :payment_mode, NOW(), NOW())");
            $stmt->execute([
                'bill_number' => $billNumber,
                'shop_id' => $shopId,
                'user_id' => $userId,
                'bill_date' => $billDate,
                'total_amount' => $totalAmount,
                'received_amount' => $billReceivedAmount,
                'pending_amount' => $pendingAmount,
                'status' => $status,
                'notes' => $notes,
                'payment_mode' => $paymentMode
            ]);
            
            $billId = (int)$db->lastInsertId();
            
            // Record payment transaction
            if ($billReceivedAmount > 0) {
                $payStmt = $db->prepare("INSERT INTO bill_payments (bill_id, amount, payment_mode, payment_date, user_id, created_at)
                                         VALUES (:bill_id, :amount, :payment_mode, :payment_date, :user_id, NOW())");
                $payStmt->execute([
                    'bill_id' => $billId,
                    'amount' => $billReceivedAmount,
                    'payment_mode' => $paymentMode,
                    'payment_date' => $billDate,
                    'user_id' => $userId
                ]);
            }
            
            // Insert Items & Update Stocks
            if (!$isPaymentBill) {
                $itemInsertStmt = $db->prepare("INSERT INTO bill_items (bill_id, product_id, quantity, rate, amount, sgst, cgst, hsn_code, createdAt) 
                                                VALUES (:bill_id, :product_id, :quantity, :rate, :amount, :sgst, :cgst, :hsn_code, NOW())");
                                                
                foreach ($billItems as $item) {
                    $itemInsertStmt->execute([
                        'bill_id' => $billId,
                        'product_id' => $item['productId'],
                        'quantity' => $item['quantity'],
                        'rate' => $item['rate'],
                        'amount' => $item['amount'],
                        'sgst' => $item['sgst'],
                        'cgst' => $item['cgst'],
                        'hsn_code' => $item['hsnCode']
                    ]);
                    
                    // Reduce stock
                    if ($item['quantity'] > 0) {
                        $stockStmt = $db->prepare("SELECT s.id, s.quantity, p.product_name, p.unit 
                                                  FROM stocks s 
                                                  JOIN products p ON s.product_id = p.id 
                                                  WHERE s.product_id = :product_id LIMIT 1");
                        $stockStmt->execute(['product_id' => $item['productId']]);
                        $stock = $stockStmt->fetch();
                        
                        if ($stock) {
                            $oldQty = (float)$stock['quantity'];
                            $newStockQty = max(0.0, $oldQty - $item['quantity']);
                            
                            $updateStockStmt = $db->prepare("UPDATE stocks SET quantity = :qty, updatedAt = NOW() WHERE product_id = :product_id");
                            $updateStockStmt->execute(['qty' => $newStockQty, 'product_id' => $item['productId']]);
                            
                            // Check for low stock threshold transition
                            $threshStmt = $db->query("SELECT setting_value FROM settings WHERE setting_key = 'low_stock_threshold'");
                            $threshold = (float)($threshStmt->fetchColumn() ?: 20.0);
                            
                            if ($oldQty > $threshold && $newStockQty <= $threshold) {
                                $productName = $stock['product_name'];
                                $unit = $stock['unit'];
                                
                                // WhatsApp Alert
                                require_once __DIR__ . '/../utils/whatsapp.php';
                                $msg = "⚠️ *Low Stock Alert* ⚠️\n\nProduct: *{$productName}*\nRemaining Qty: *{$newStockQty} {$unit}*\n\nPlease replenish the stock.";
                                sendWhatsAppAlert($msg);
                                
                                // SMS Alert
                                require_once __DIR__ . '/../utils/sms.php';
                                $smsMsg = "Low Stock Alert: Product {$productName}, Remaining Qty: {$newStockQty} {$unit}. Please replenish.";
                                sendSMSAlert($smsMsg);
                            }
                        }
                    }
                }
            }
            
            // Apply payments to pending bills
            $paymentToApply = 0;
            if ($shouldApplyToPending) {
                $paymentToApply = $receivedAmount;
            } elseif ($excessPayment > 0) {
                $paymentToApply = $excessPayment;
            }
            
            if ($paymentToApply > 0) {
                $pendingStmt = $db->prepare("SELECT * FROM bills WHERE shop_id = :shop_id AND status = 'PENDING' ORDER BY bill_date ASC");
                $pendingStmt->execute(['shop_id' => $shopId]);
                $pendingBills = $pendingStmt->fetchAll();
                
                $updatePendingStmt = $db->prepare("UPDATE bills SET received_amount = :rec, pending_amount = :pend, status = :status, updatedAt = NOW() WHERE id = :id");
                
                foreach ($pendingBills as $pBill) {
                    if ($paymentToApply <= 0) break;
                    
                    $pBillId = (int)$pBill['id'];
                    $pBillPending = (float)$pBill['pending_amount'];
                    $pBillReceived = (float)$pBill['received_amount'];
                    
                    $apply = min($paymentToApply, $pBillPending);
                    $newPending = round($pBillPending - $apply, 2);
                    
                    // If remaining pending amount is less than 1.00 Rupee, clear it completely
                    if ($newPending > 0 && $newPending < 1.00) {
                        $apply += $newPending;
                        $newPending = 0.0;
                    }
                    
                    $newReceived = round($pBillReceived + $apply, 2);
                    $newStatus = $newPending <= 0 ? 'COMPLETED' : 'PENDING';
                    
                    $updatePendingStmt->execute([
                        'rec' => $newReceived,
                        'pend' => $newPending,
                        'status' => $newStatus,
                        'id' => $pBillId
                    ]);
                    
                    // Record applied payment on pending bill
                    if ($apply > 0) {
                        $payPendingStmt = $db->prepare("INSERT INTO bill_payments (bill_id, amount, payment_mode, payment_date, user_id, created_at)
                                                        VALUES (:bill_id, :amount, :payment_mode, :payment_date, :user_id, NOW())");
                        $payPendingStmt->execute([
                            'bill_id' => $pBillId,
                            'amount' => $apply,
                            'payment_mode' => $paymentMode,
                            'payment_date' => $billDate,
                            'user_id' => $userId
                        ]);
                    }
                    
                    $paymentToApply = round($paymentToApply - $apply, 2);
                }
            }
            
            $db->commit();
            
            // Fetch completed bill
            $stmt = $db->prepare("SELECT * FROM bills WHERE id = :id");
            $stmt->execute(['id' => $billId]);
            $bill = formatBillRecord($db, $stmt->fetch());
            
            sendResponse(true, 'Bill created successfully', $bill, 201);
        } catch (PDOException $e) {
            $db->rollBack();
            sendResponse(false, 'Database error: ' . $e->getMessage(), null, 500);
        }
    }

    /**
     * Handle PUT /api/bills/:id
     */
    function updateBill($billId) {
        $body = getJsonInput();
        
        $db = getDatabaseConnection();
        try {
            // Fetch current bill
            $stmt = $db->prepare("SELECT * FROM bills WHERE id = :id LIMIT 1");
            $stmt->execute(['id' => $billId]);
            $currentBill = $stmt->fetch();
            
            if (!$currentBill) {
                sendResponse(false, 'Bill not found', null, 404);
            }
            
            $updates = [];
            $params = ['id' => $billId];
            
            if (isset($body['receivedAmount'])) {
                $receivedAmount = round((float)$body['receivedAmount'], 2);
                $totalAmount = (float)$currentBill['total_amount'];
                $pendingAmount = $totalAmount - $receivedAmount;
                
                // If remaining pending amount is less than 1.00 Rupee, clear it completely
                if ($pendingAmount > 0 && $pendingAmount < 1.00) {
                    $receivedAmount = $totalAmount;
                    $pendingAmount = 0.0;
                } else {
                    $pendingAmount = round($pendingAmount, 2);
                }
                
                $updates[] = "received_amount = :received_amount";
                $params['received_amount'] = $receivedAmount;
                
                $updates[] = "pending_amount = :pending_amount";
                $params['pending_amount'] = $pendingAmount;
                
                if ($currentBill['status'] !== 'CANCELLED') {
                    $status = $pendingAmount <= 0 ? 'COMPLETED' : 'PENDING';
                    $updates[] = "status = :status";
                    $params['status'] = $status;
                }
            }
            
            if (isset($body['notes'])) {
                $updates[] = "notes = :notes";
                $params['notes'] = $body['notes'];
            }
            
            if (isset($body['paymentMode'])) {
                $updates[] = "payment_mode = :payment_mode";
                $params['payment_mode'] = $body['paymentMode'];
            }
            
            if (empty($updates)) {
                sendResponse(false, 'No fields to update', null, 400);
            }
            
            $updates[] = "updatedAt = NOW()";
            $updatesStr = implode(', ', $updates);
            
            $stmt = $db->prepare("UPDATE bills SET {$updatesStr} WHERE id = :id");
            $stmt->execute($params);

            // Record transaction if receivedAmount was increased
            if (isset($body['receivedAmount'])) {
                $oldReceived = (float)$currentBill['received_amount'];
                $newReceived = (float)$params['received_amount'];
                $diff = round($newReceived - $oldReceived, 2);
                
                if ($diff > 0) {
                    $payUpdateStmt = $db->prepare("INSERT INTO bill_payments (bill_id, amount, payment_mode, payment_date, user_id, created_at)
                                                   VALUES (:bill_id, :amount, :payment_mode, NOW(), :user_id, NOW())");
                    $payUpdateStmt->execute([
                        'bill_id' => $billId,
                        'amount' => $diff,
                        'payment_mode' => $body['paymentMode'] ?? $currentBill['payment_mode'] ?? 'CASH',
                        'user_id' => $user['id'] ?? null
                    ]);
                }
            }
            
            // Fetch updated bill
            $stmt = $db->prepare("SELECT * FROM bills WHERE id = :id");
            $stmt->execute(['id' => $billId]);
            $bill = formatBillRecord($db, $stmt->fetch());
            
            sendResponse(true, 'Bill updated successfully', $bill);
        } catch (PDOException $e) {
            sendResponse(false, 'Database error: ' . $e->getMessage(), null, 500);
        }
    }

    /**
     * Handle DELETE /api/bills/:id
     */
    function deleteBill($billId) {
        $db = getDatabaseConnection();
        try {
            $db->beginTransaction();
            
            // Get bill items to restore stock
            $stmt = $db->prepare("SELECT * FROM bills WHERE id = :id LIMIT 1");
            $stmt->execute(['id' => $billId]);
            $bill = $stmt->fetch();
            
            if (!$bill) {
                $db->rollBack();
                sendResponse(false, 'Bill not found', null, 404);
            }
            
            // Fetch bill items
            $stmt = $db->prepare("SELECT product_id, quantity FROM bill_items WHERE bill_id = :bill_id");
            $stmt->execute(['bill_id' => $billId]);
            $items = $stmt->fetchAll();
            
            // Restore stock
            $updateStockStmt = $db->prepare("UPDATE stocks SET quantity = quantity + :qty, updatedAt = NOW() WHERE product_id = :product_id");
            
            foreach ($items as $item) {
                $qty = (float)$item['quantity'];
                if ($qty > 0) {
                    // Verify stock entry exists
                    $stmt = $db->prepare("SELECT id FROM stocks WHERE product_id = :product_id LIMIT 1");
                    $stmt->execute(['product_id' => $item['product_id']]);
                    if ($stmt->fetch()) {
                        $updateStockStmt->execute([
                            'qty' => $qty,
                            'product_id' => $item['product_id']
                        ]);
                    }
                }
            }
            
            // Delete Bill (will delete items automatically via foreign key cascade, or manually delete)
            $stmt = $db->prepare("DELETE FROM bill_items WHERE bill_id = :bill_id");
            $stmt->execute(['bill_id' => $billId]);
            
            $stmt = $db->prepare("DELETE FROM bills WHERE id = :id");
            $stmt->execute(['id' => $billId]);
            
            $db->commit();
            sendResponse(true, 'Bill deleted successfully');
        } catch (PDOException $e) {
            $db->rollBack();
            sendResponse(false, 'Database error: ' . $e->getMessage(), null, 500);
        }
    }

    /**
     * Handle GET /api/bills/shop/:shopId
     */
    function getBillsByShopId($shopId) {
        $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
        $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 10;
        $offset = ($page - 1) * $limit;
        
        $db = getDatabaseConnection();
        try {
            // Count total
            $stmt = $db->prepare("SELECT COUNT(*) FROM bills WHERE shop_id = :shop_id");
            $stmt->execute(['shop_id' => $shopId]);
            $total = (int)$stmt->fetchColumn();
            
            // Fetch bills
            $stmt = $db->prepare("SELECT * FROM bills 
                                WHERE shop_id = :shop_id 
                                ORDER BY createdAt DESC 
                                LIMIT :limit OFFSET :offset");
            $stmt->bindValue(':shop_id', $shopId, PDO::PARAM_INT);
            $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
            $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
            $stmt->execute();
            $rows = $stmt->fetchAll();
            
            $bills = [];
            foreach ($rows as $row) {
                $bills[] = formatBillRecord($db, $row);
            }
            
            $totalPages = ceil($total / $limit);
            
            echo json_encode([
                'success' => true,
                'data' => $bills,
                'pagination' => [
                    'page' => $page,
                    'limit' => $limit,
                    'total' => $total,
                    'totalPages' => $totalPages,
                    'hasNext' => $page < $totalPages,
                    'hasPrev' => $page > 1
                ]
            ]);
            exit;
        } catch (PDOException $e) {
            sendResponse(false, 'Database error: ' . $e->getMessage(), null, 500);
        }
    }

    /**
     * Handle PATCH /api/bills/:id/signature
     */
    function updateBillSignature($billId) {
        $body = getJsonInput();
        $signature = $body['signature'] ?? null;
        
        if (!$signature) {
            sendResponse(false, 'Signature is required', null, 400);
        }
        
        $db = getDatabaseConnection();
        try {
            // Verify bill exists
            $stmt = $db->prepare("SELECT id FROM bills WHERE id = :id LIMIT 1");
            $stmt->execute(['id' => $billId]);
            if (!$stmt->fetch()) {
                sendResponse(false, 'Bill not found', null, 404);
            }
            
            // Update signature
            $stmt = $db->prepare("UPDATE bills SET signature = :signature, updatedAt = NOW() WHERE id = :id");
            $stmt->execute(['signature' => $signature, 'id' => $billId]);
            
            // Fetch updated bill
            $stmt = $db->prepare("SELECT * FROM bills WHERE id = :id");
            $stmt->execute(['id' => $billId]);
            $bill = formatBillRecord($db, $stmt->fetch());
            
            sendResponse(true, 'Signature updated successfully', $bill);
        } catch (PDOException $e) {
            sendResponse(false, 'Database error: ' . $e->getMessage(), null, 500);
        }
    }

    /**
     * Handle GET /api/bills/status/pending
     */
    function getPendingBills() {
        $db = getDatabaseConnection();
        try {
            $stmt = $db->query("SELECT * FROM bills WHERE status = 'PENDING' ORDER BY createdAt DESC");
            $rows = $stmt->fetchAll();
            
            $bills = [];
            foreach ($rows as $row) {
                $bills[] = formatBillRecord($db, $row);
            }
            
            sendResponse(true, '', $bills);
        } catch (PDOException $e) {
            sendResponse(false, 'Database error: ' . $e->getMessage(), null, 500);
        }
    }
