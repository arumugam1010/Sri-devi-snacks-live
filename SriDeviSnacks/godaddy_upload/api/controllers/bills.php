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
            $subAction = $parts[3] ?? '';
            if (is_numeric($shopId)) {
                if ($subAction === 'payments' && $method === 'GET') {
                    getShopPaymentsHistory((int)$shopId);
                    return;
                } elseif (empty($subAction) && $method === 'GET') {
                    getBillsByShopId((int)$shopId);
                    return;
                }
            }
        }
        
        // GET /bills/payments/received
        if ($action === 'payments') {
            $subAction = $parts[2] ?? '';
            if ($subAction === 'received' && $method === 'GET') {
                getPendingReceivedPayments();
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
        
        // Fetch Cash and GPay amounts from bill_payments
        $cashAmount = 0;
        $gpayAmount = 0;
        
        $payStmt = $db->prepare("SELECT amount, payment_mode FROM bill_payments WHERE bill_id = :bill_id");
        $payStmt->execute(['bill_id' => $billId]);
        $payments = $payStmt->fetchAll();
        
        foreach ($payments as $pay) {
            if ($pay['payment_mode'] === 'CASH') {
                $cashAmount += (float)$pay['amount'];
            } else if ($pay['payment_mode'] === 'GPAY') {
                $gpayAmount += (float)$pay['amount'];
            }
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
            'cash_amount' => $cashAmount,
            'gpay_amount' => $gpayAmount,
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

    function getRoundingDetailsPhp($rawTotal) {
    $absTotal = abs($rawTotal);
    $fraction = round($absTotal - floor($absTotal), 2);
    if ($fraction >= 0.10 && $fraction <= 0.90) {
        $finalTotal = floor($absTotal);
    } else {
        $finalTotal = round($absTotal);
    }
    return ($rawTotal < 0) ? -$finalTotal : $finalTotal;
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
        $cashAmount = isset($body['cashAmount']) ? round((float)$body['cashAmount'], 2) : (isset($body['cash_amount']) ? round((float)$body['cash_amount'], 2) : 0.00);
        $gpayAmount = isset($body['gpayAmount']) ? round((float)$body['gpayAmount'], 2) : (isset($body['gpay_amount']) ? round((float)$body['gpay_amount'], 2) : 0.00);
        
        $paymentMode = $body['paymentMode'] ?? null;
        
        $db = getDatabaseConnection();
        try {
            $db->beginTransaction();
            
            // Check if shop exists
            $shopStmt = $db->prepare("SELECT id, shop_name FROM shops WHERE id = :id LIMIT 1");
            $shopStmt->execute(['id' => $shopId]);
            $shop = $shopStmt->fetch();
            if (!$shop) {
                $db->rollBack();
                sendResponse(false, 'Shop not found', null, 404);
            }
            
            // Format bill date
            $billDate = $billDateVal ? date('Y-m-d H:i:s', strtotime($billDateVal)) : date('Y-m-d H:i:s');
            
            // Generate unique bill number
            $billNumber = 'BILL-' . time() . '-' . rand(1000, 9999);
            
            // Get product rates for calculating amount
            $productStmt = $db->query("SELECT id, price, hsn_code FROM products");
            $products = $productStmt->fetchAll();
            $productMap = [];
            foreach ($products as $p) {
                $productMap[$p['id']] = $p['price'];
            }
            
            $items = $body['items'] ?? [];
            $totalAmount = 0.00;
            $billItems = [];
            
            foreach ($items as $item) {
                $prodId = (int)($item['product_id'] ?? $item['productId'] ?? 0);
                $qty = (float)($item['quantity'] ?? 0);
                
                // Use price/rate from request if provided, otherwise default to product price
                $rate = isset($item['price']) ? (float)$item['price'] : (isset($item['rate']) ? (float)$item['rate'] : ($productMap[$prodId] ?? 0.00));
                
                // Calculate tax
                $sgst = isset($item['sgst']) ? (float)$item['sgst'] : 0.00;
                $cgst = isset($item['cgst']) ? (float)$item['cgst'] : 0.00;
                
                $amount = round($qty * $rate, 2);
                $totalAmount += $amount + $sgst + $cgst;
                
                $billItems[] = [
                    'productId' => $prodId,
                    'quantity' => $qty,
                    'rate' => $rate,
                    'amount' => $amount,
                    'sgst' => $sgst,
                    'cgst' => $cgst,
                    'hsnCode' => $item['hsnCode'] ?? $item['hsn_code'] ?? ($productMap[$prodId] ?? '')
                ];
            }
            
            $isPaymentBill = empty($items) && $receivedAmount > 0;
            
            $totalAmount = getRoundingDetailsPhp($totalAmount);
            
            // Insert Today's Bill with received = 0, pending = total_amount.
            // If it is a payment-only bill, it will have total = 0, so it will be COMPLETED immediately.
            $initialStatus = $totalAmount <= 0 ? 'COMPLETED' : 'PENDING';
            
            $stmt = $db->prepare("INSERT INTO bills (bill_number, shop_id, user_id, bill_date, total_amount, received_amount, pending_amount, status, notes, payment_mode, createdAt, updatedAt) 
                                VALUES (:bill_number, :shop_id, :user_id, :bill_date, :total_amount, 0, :pending_amount, :status, :notes, :payment_mode, NOW(), NOW())");
            $stmt->execute([
                'bill_number' => $billNumber,
                'shop_id' => $shopId,
                'user_id' => $userId,
                'bill_date' => $billDate,
                'total_amount' => $totalAmount,
                'pending_amount' => $totalAmount,
                'status' => $initialStatus,
                'notes' => $notes,
                'payment_mode' => $paymentMode
            ]);
            
            $billId = (int)$db->lastInsertId();
            
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
            
            // FIFO Payment Distribution Across Pending Bills (including today's bill)
            if ($receivedAmount > 0) {
                // Fetch all pending bills for this shop ordered oldest to newest
                $pendingStmt = $db->prepare("SELECT id, total_amount, received_amount, pending_amount, status FROM bills WHERE shop_id = :shop_id AND status = 'PENDING' ORDER BY bill_date ASC, id ASC");
                $pendingStmt->execute(['shop_id' => $shopId]);
                $pendingBills = $pendingStmt->fetchAll();
                
                // Set up payment chunks for split payment
                $paymentChunks = [];
                if ($cashAmount > 0) {
                    $paymentChunks[] = ['amount' => $cashAmount, 'mode' => 'CASH'];
                }
                if ($gpayAmount > 0) {
                    $paymentChunks[] = ['amount' => $gpayAmount, 'mode' => 'GPAY'];
                }
                if (empty($paymentChunks)) {
                    $paymentChunks[] = ['amount' => $receivedAmount, 'mode' => $paymentMode ?: 'CASH'];
                }
                
                $chunkIndex = 0;
                $numChunks = count($paymentChunks);
                
                foreach ($pendingBills as $index => $pBill) {
                    $pBillId = (int)$pBill['id'];
                    $pBillPending = (float)$pBill['pending_amount'];
                    $pBillReceived = (float)$pBill['received_amount'];
                    
                    $isLastBill = ($index === count($pendingBills) - 1);
                    $totalAppliedToThisBill = 0;
                    
                    while ($chunkIndex < $numChunks && ($pBillPending > 0 || ($isLastBill && $paymentChunks[$chunkIndex]['amount'] > 0))) {
                        $chunk = &$paymentChunks[$chunkIndex];
                        if ($chunk['amount'] <= 0) {
                            $chunkIndex++;
                            continue;
                        }
                        
                        $apply = min($chunk['amount'], $pBillPending);
                        if ($isLastBill && $chunk['amount'] > $pBillPending) {
                            $apply = $chunk['amount'];
                        }
                        
                        $newPending = round($pBillPending - $apply, 2);
                        if ($newPending > 0 && $newPending < 1.00 && !$isLastBill) {
                            $apply = $pBillPending;
                            $newPending = 0.0;
                        }
                        
                        if ($apply > 0) {
                            $pBillReceived = round($pBillReceived + $apply, 2);
                            $pBillPending = $newPending;
                            $totalAppliedToThisBill = round($totalAppliedToThisBill + $apply, 2);
                            
                            // Record payment chunk in bill_payments
                            $payPendingStmt = $db->prepare("INSERT INTO bill_payments (bill_id, amount, payment_mode, payment_date, user_id, created_at)
                                                            VALUES (:bill_id, :amount, :payment_mode, :payment_date, :user_id, NOW())");
                            $payPendingStmt->execute([
                                'bill_id' => $pBillId,
                                'amount' => $apply,
                                'payment_mode' => $chunk['mode'],
                                'payment_date' => $billDate,
                                'user_id' => $userId
                            ]);
                            
                            $chunk['amount'] = round($chunk['amount'] - $apply, 2);
                        }
                        
                        if ($chunk['amount'] <= 0) {
                            $chunkIndex++;
                        }
                        
                        if ($pBillPending <= 0 && !$isLastBill) {
                            break;
                        }
                    }
                    
                    if ($totalAppliedToThisBill > 0) {
                        $newStatus = $pBillPending <= 0 ? 'COMPLETED' : 'PENDING';
                        $updatePendingStmt = $db->prepare("UPDATE bills SET received_amount = :rec, pending_amount = :pend, status = :status, updatedAt = NOW() WHERE id = :id");
                        $updatePendingStmt->execute([
                            'rec' => $pBillReceived,
                            'pend' => $pBillPending,
                            'status' => $newStatus,
                            'id' => $pBillId
                        ]);
                    }
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

            // Record transaction if receivedAmount was changed
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
                } elseif ($diff < 0) {
                    $absDiff = abs($diff);
                    $payStmt = $db->prepare("SELECT id, amount FROM bill_payments WHERE bill_id = :bill_id ORDER BY id DESC");
                    $payStmt->execute(['bill_id' => $billId]);
                    $payments = $payStmt->fetchAll();
                    
                    $remainingToRemove = $absDiff;
                    foreach ($payments as $pay) {
                        if ($remainingToRemove <= 0) break;
                        $payAmount = (float)$pay['amount'];
                        $payId = (int)$pay['id'];
                        
                        if ($payAmount <= $remainingToRemove) {
                            $db->prepare("DELETE FROM bill_payments WHERE id = :id")->execute(['id' => $payId]);
                            $remainingToRemove = round($remainingToRemove - $payAmount, 2);
                        } else {
                            $newPayAmount = round($payAmount - $remainingToRemove, 2);
                            $db->prepare("UPDATE bill_payments SET amount = :amt WHERE id = :id")->execute(['amt' => $newPayAmount, 'id' => $payId]);
                            $remainingToRemove = 0;
                        }
                    }
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

    /**
     * Handle GET /api/bills/payments/received
     */
    function getPendingReceivedPayments() {
        $db = getDatabaseConnection();
        try {
            // Fetch all payments made for bills (could be partial or full, but they represent received amounts)
            // We join with bills and shops to get shop name and bill number
            $stmt = $db->query("
                SELECT bp.id, bp.amount, bp.payment_mode, bp.payment_date, bp.created_at,
                       b.bill_number, b.total_amount, b.pending_amount,
                       s.shop_name
                FROM bill_payments bp
                JOIN bills b ON bp.bill_id = b.id
                JOIN shops s ON b.shop_id = s.id
                WHERE DATE(bp.payment_date) != DATE(b.bill_date)
                ORDER BY bp.payment_date DESC, bp.created_at DESC
            ");
            $payments = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            sendResponse(true, '', $payments);
        } catch (PDOException $e) {
            sendResponse(false, 'Database error: ' . $e->getMessage(), null, 500);
        }
    }

    /**
     * Handle GET /api/bills/shop/:shopId/payments
     */
    function getShopPaymentsHistory($shopId) {
        $db = getDatabaseConnection();
        try {
            $stmt = $db->prepare("
                SELECT bp.payment_date as paymentDate, bp.amount, bp.payment_mode as paymentMode, b.id as billNumber
                FROM bill_payments bp
                JOIN bills b ON bp.bill_id = b.id
                WHERE b.shop_id = :shop_id AND DATE(bp.payment_date) != DATE(b.bill_date)
                ORDER BY bp.payment_date DESC, bp.id DESC
            ");
            $stmt->execute(['shop_id' => $shopId]);
            $payments = $stmt->fetchAll(PDO::FETCH_ASSOC);
            sendResponse(true, '', $payments);
        } catch (PDOException $e) {
            sendResponse(false, 'Database error: ' . $e->getMessage(), null, 500);
        }
    }
