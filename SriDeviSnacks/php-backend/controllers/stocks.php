<?php
/**
 * Stocks Controller
 */

function handleStocksRoute($parts, $method) {
    getAuthenticatedUser();
    
    $action = $parts[1] ?? '';
    
    // GET /stocks/alerts/low-stock
    if ($action === 'alerts') {
        $subAction = $parts[2] ?? '';
        if ($subAction === 'low-stock' && $method === 'GET') {
            getLowStockAlerts();
            return;
        }
    }
    
    // GET /stocks/product/:productId
    if ($action === 'product') {
        $productId = $parts[2] ?? '';
        if (is_numeric($productId) && $method === 'GET') {
            getStockByProductId((int)$productId);
            return;
        }
    }
    
    // GET /stocks or POST /stocks
    if (empty($action)) {
        if ($method === 'GET') {
            getStocksList();
        } elseif ($method === 'POST') {
            createStock();
        } else {
            sendResponse(false, 'Method not allowed', null, 405);
        }
        return;
    }
    
    // Stock details by ID
    if (is_numeric($action)) {
        $stockId = (int)$action;
        $subAction = $parts[2] ?? '';
        
        if (empty($subAction)) {
            if ($method === 'GET') {
                getStockById($stockId);
            } elseif ($method === 'PUT') {
                updateStock($stockId);
            } elseif ($method === 'DELETE') {
                deleteStock($stockId);
            } else {
                sendResponse(false, 'Method not allowed', null, 405);
            }
        } elseif ($subAction === 'adjust' && $method === 'PATCH') {
            adjustStock($stockId);
        } else {
            sendResponse(false, 'Action not found', null, 404);
        }
        return;
    }
    
    sendResponse(false, 'Action not found in stocks', null, 404);
}

/**
 * Handle GET /api/stocks
 */
function getStocksList() {
    $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
    $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 10;
    $search = isset($_GET['search']) ? $_GET['search'] : '';
    $sortBy = isset($_GET['sortBy']) ? $_GET['sortBy'] : 'updatedAt';
    $sortOrder = isset($_GET['sortOrder']) && strtolower($_GET['sortOrder']) === 'asc' ? 'asc' : 'desc';
    
    $sortFieldMap = [
        'id' => 's.id',
        'quantity' => 's.quantity',
        'rate' => 's.rate',
        'createdAt' => 's.createdAt',
        'updatedAt' => 's.updatedAt',
        'productName' => 'p.product_name'
    ];
    $sortBySql = $sortFieldMap[$sortBy] ?? 's.updatedAt';
    
    $offset = ($page - 1) * $limit;
    
    $db = getDatabaseConnection();
    try {
        $whereSql = "";
        $params = [];
        
        if ($search !== '') {
            $whereSql = "WHERE p.product_name LIKE :search1 OR p.unit LIKE :search2 OR p.hsn_code LIKE :search3";
            $params['search1'] = '%' . $search . '%';
            $params['search2'] = '%' . $search . '%';
            $params['search3'] = '%' . $search . '%';
        }
        
        // Count total
        $countStmt = $db->prepare("SELECT COUNT(*) FROM stocks s JOIN products p ON s.product_id = p.id {$whereSql}");
        $countStmt->execute($params);
        $total = (int)$countStmt->fetchColumn();
        
        // Get stocks
        $querySql = "SELECT s.id, s.product_id as productId, s.quantity, s.rate, s.createdAt, s.updatedAt,
                            p.product_name as productName, p.unit, p.hsn_code as hsnCode, p.gst, p.price as productPrice, p.createdAt as p_createdAt, p.updatedAt as p_updatedAt
                     FROM stocks s
                     JOIN products p ON s.product_id = p.id
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
        $rows = $stmt->fetchAll();
        
        $stocks = [];
        foreach ($rows as $row) {
            $stocks[] = [
                'id' => (int)$row['id'],
                'productId' => (int)$row['productId'],
                'quantity' => (float)$row['quantity'],
                'rate' => (float)$row['rate'],
                'createdAt' => $row['createdAt'],
                'updatedAt' => $row['updatedAt'],
                'product' => [
                    'id' => (int)$row['productId'],
                    'productName' => $row['productName'],
                    'unit' => $row['unit'],
                    'hsnCode' => $row['hsnCode'],
                    'gst' => (float)$row['gst'],
                    'price' => (float)$row['productPrice'],
                    'createdAt' => $row['p_createdAt'],
                    'updatedAt' => $row['p_updatedAt']
                ]
            ];
        }
        
        $totalPages = ceil($total / $limit);
        
        echo json_encode([
            'success' => true,
            'data' => $stocks,
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
 * Handle GET /api/stocks/:id
 */
function getStockById($stockId) {
    $db = getDatabaseConnection();
    try {
        // Fetch stock
        $stmt = $db->prepare("SELECT s.id, s.product_id as productId, s.quantity, s.rate, s.createdAt, s.updatedAt,
                                     p.product_name as productName, p.unit, p.hsn_code as hsnCode, p.gst, p.price as productPrice, p.createdAt as p_createdAt, p.updatedAt as p_updatedAt
                              FROM stocks s
                              JOIN products p ON s.product_id = p.id
                              WHERE s.id = :id LIMIT 1");
        $stmt->execute(['id' => $stockId]);
        $row = $stmt->fetch();
        
        if (!$row) {
            sendResponse(false, 'Stock not found', null, 404);
        }
        
        $productId = (int)$row['productId'];
        
        // Fetch shop products for this product
        $stmt = $db->prepare("SELECT sp.id, sp.shop_id as shopId, sp.product_id as productId, sp.price, sp.createdAt, sp.updatedAt,
                                     sh.shop_name as shopName, sh.address, sh.contact, sh.email, sh.gst_number as gstNumber, sh.status
                              FROM shop_products sp
                              JOIN shops sh ON sp.shop_id = sh.id
                              WHERE sp.product_id = :product_id");
        $stmt->execute(['product_id' => $productId]);
        $shopProducts = $stmt->fetchAll();
        $formattedShopProducts = [];
        foreach ($shopProducts as $sp) {
            $formattedShopProducts[] = [
                'id' => (int)$sp['id'],
                'shopId' => (int)$sp['shopId'],
                'productId' => (int)$sp['productId'],
                'price' => (float)$sp['price'],
                'createdAt' => $sp['createdAt'],
                'updatedAt' => $sp['updatedAt'],
                'shop' => [
                    'id' => (int)$sp['shopId'],
                    'shopName' => $sp['shopName'],
                    'address' => $sp['address'],
                    'contact' => $sp['contact'],
                    'email' => $sp['email'],
                    'gstNumber' => $sp['gstNumber'],
                    'status' => $sp['status']
                ]
            ];
        }
        
        // Fetch 10 recent bill items
        $stmt = $db->prepare("SELECT bi.id, bi.bill_id as billId, bi.product_id as productId, bi.quantity, bi.rate, bi.amount, bi.sgst, bi.cgst, bi.hsn_code as hsnCode, bi.createdAt,
                                     b.bill_number as billNumber, b.bill_date as billDate, b.status as billStatus,
                                     sh.id as shopId, sh.shop_name as shopName
                              FROM bill_items bi
                              JOIN bills b ON bi.bill_id = b.id
                              JOIN shops sh ON b.shop_id = sh.id
                              WHERE bi.product_id = :product_id
                              ORDER BY bi.createdAt DESC LIMIT 10");
        $stmt->execute(['product_id' => $productId]);
        $billItems = $stmt->fetchAll();
        $formattedBillItems = [];
        foreach ($billItems as $bi) {
            $formattedBillItems[] = [
                'id' => (int)$bi['id'],
                'billId' => (int)$bi['billId'],
                'productId' => (int)$bi['productId'],
                'quantity' => (float)$bi['quantity'],
                'rate' => (float)$bi['rate'],
                'amount' => (float)$bi['amount'],
                'sgst' => (float)$bi['sgst'],
                'cgst' => (float)$bi['cgst'],
                'hsnCode' => $bi['hsnCode'],
                'createdAt' => $bi['createdAt'],
                'bill' => [
                    'id' => (int)$bi['billId'],
                    'billNumber' => $bi['billNumber'],
                    'billDate' => $bi['billDate'],
                    'status' => $bi['billStatus'],
                    'shop' => [
                        'id' => (int)$bi['shopId'],
                        'shopName' => $bi['shopName']
                    ]
                ]
            ];
        }
        
        $stock = [
            'id' => (int)$row['id'],
            'productId' => $productId,
            'quantity' => (float)$row['quantity'],
            'rate' => (float)$row['rate'],
            'createdAt' => $row['createdAt'],
            'updatedAt' => $row['updatedAt'],
            'product' => [
                'id' => $productId,
                'productName' => $row['productName'],
                'unit' => $row['unit'],
                'hsnCode' => $row['hsnCode'],
                'gst' => (float)$row['gst'],
                'price' => (float)$row['productPrice'],
                'createdAt' => $row['p_createdAt'],
                'updatedAt' => $row['p_updatedAt'],
                'shopProducts' => $formattedShopProducts,
                'billItems' => $formattedBillItems
            ]
        ];
        
        sendResponse(true, '', $stock);
    } catch (PDOException $e) {
        sendResponse(false, 'Database error: ' . $e->getMessage(), null, 500);
    }
}

/**
 * Handle GET /api/stocks/product/:productId
 */
function getStockByProductId($productId) {
    $db = getDatabaseConnection();
    try {
        $stmt = $db->prepare("SELECT s.id, s.product_id as productId, s.quantity, s.rate, s.createdAt, s.updatedAt,
                                     p.product_name as productName, p.unit, p.hsn_code as hsnCode, p.gst, p.price as productPrice
                              FROM stocks s
                              JOIN products p ON s.product_id = p.id
                              WHERE s.product_id = :product_id LIMIT 1");
        $stmt->execute(['product_id' => $productId]);
        $row = $stmt->fetch();
        
        if (!$row) {
            sendResponse(false, 'Stock not found for this product', null, 404);
        }
        
        $stock = [
            'id' => (int)$row['id'],
            'productId' => (int)$row['productId'],
            'quantity' => (float)$row['quantity'],
            'rate' => (float)$row['rate'],
            'createdAt' => $row['createdAt'],
            'updatedAt' => $row['updatedAt'],
            'product' => [
                'id' => (int)$row['productId'],
                'productName' => $row['productName'],
                'unit' => $row['unit'],
                'hsnCode' => $row['hsnCode'],
                'gst' => (float)$row['gst'],
                'price' => (float)$row['productPrice']
            ]
        ];
        
        sendResponse(true, '', $stock);
    } catch (PDOException $e) {
        sendResponse(false, 'Database error: ' . $e->getMessage(), null, 500);
    }
}

/**
 * Handle POST /api/stocks
 */
function createStock() {
    $body = getJsonInput();
    $productId = isset($body['productId']) ? (int)$body['productId'] : 0;
    $quantity = isset($body['quantity']) ? (float)$body['quantity'] : 0.0;
    $rate = isset($body['rate']) ? (float)$body['rate'] : 0.0;
    
    if ($productId <= 0) {
        sendResponse(false, 'Product ID is required', null, 400);
    }
    
    $db = getDatabaseConnection();
    try {
        // Check if product exists
        $stmt = $db->prepare("SELECT id FROM products WHERE id = :id LIMIT 1");
        $stmt->execute(['id' => $productId]);
        if (!$stmt->fetch()) {
            sendResponse(false, 'Product not found', null, 404);
        }
        
        // Check if stock already exists
        $stmt = $db->prepare("SELECT id FROM stocks WHERE product_id = :product_id LIMIT 1");
        $stmt->execute(['product_id' => $productId]);
        if ($stmt->fetch()) {
            sendResponse(false, 'Stock already exists for this product. Use update instead.', null, 409);
        }
        
        $stmt = $db->prepare("INSERT INTO stocks (product_id, quantity, rate, createdAt, updatedAt) 
                              VALUES (:product_id, :quantity, :rate, NOW(), NOW())");
        $stmt->execute([
            'product_id' => $productId,
            'quantity' => $quantity,
            'rate' => $rate
        ]);
        
        $stockId = (int)$db->lastInsertId();
        
        // Fetch new stock
        $stmt = $db->prepare("SELECT s.id, s.product_id as productId, s.quantity, s.rate, s.createdAt, s.updatedAt,
                                     p.product_name as productName, p.unit
                              FROM stocks s
                              JOIN products p ON s.product_id = p.id
                              WHERE s.id = :id");
        $stmt->execute(['id' => $stockId]);
        $row = $stmt->fetch();
        
        $formatted = [
            'id' => (int)$row['id'],
            'productId' => (int)$row['productId'],
            'quantity' => (float)$row['quantity'],
            'rate' => (float)$row['rate'],
            'createdAt' => $row['createdAt'],
            'updatedAt' => $row['updatedAt'],
            'product' => [
                'id' => (int)$row['productId'],
                'productName' => $row['productName'],
                'unit' => $row['unit']
            ]
        ];
        
        sendResponse(true, 'Stock created successfully', $formatted, 201);
    } catch (PDOException $e) {
        sendResponse(false, 'Database error: ' . $e->getMessage(), null, 500);
    }
}

/**
 * Handle PUT /api/stocks/:id
 */
function updateStock($stockId) {
    $body = getJsonInput();
    
    $db = getDatabaseConnection();
    try {
        // Check if exists
        $stmt = $db->prepare("SELECT id, quantity FROM stocks WHERE id = :id LIMIT 1");
        $stmt->execute(['id' => $stockId]);
        $oldStock = $stmt->fetch();
        if (!$oldStock) {
            sendResponse(false, 'Stock not found', null, 404);
        }
        
        $prevQuantity = (float)$oldStock['quantity'];
        
        $updates = [];
        $params = ['id' => $stockId];
        
        if (isset($body['quantity'])) {
            $updates[] = "quantity = :quantity";
            $params['quantity'] = (float)$body['quantity'];
        }
        if (isset($body['rate'])) {
            $updates[] = "rate = :rate";
            $params['rate'] = (float)$body['rate'];
        }
        
        if (empty($updates)) {
            sendResponse(false, 'No fields to update', null, 400);
        }
        
        $updates[] = "updatedAt = NOW()";
        $updatesStr = implode(', ', $updates);
        
        $stmt = $db->prepare("UPDATE stocks SET {$updatesStr} WHERE id = :id");
        $stmt->execute($params);
        
        // Fetch updated stock
        $stmt = $db->prepare("SELECT s.id, s.product_id as productId, s.quantity, s.rate, s.createdAt, s.updatedAt,
                                     p.product_name as productName, p.unit
                              FROM stocks s
                              JOIN products p ON s.product_id = p.id
                              WHERE s.id = :id");
        $stmt->execute(['id' => $stockId]);
        $row = $stmt->fetch();
        
        if ($row) {
            $newQuantity = (float)$row['quantity'];
            
            // Check for low stock threshold transition
            $threshStmt = $db->query("SELECT setting_value FROM settings WHERE setting_key = 'low_stock_threshold'");
            $threshold = (float)($threshStmt->fetchColumn() ?: 20.0);
            
            if ($prevQuantity > $threshold && $newQuantity <= $threshold) {
                $productName = $row['productName'];
                $unit = $row['unit'];
                
                // WhatsApp Alert
                require_once __DIR__ . '/../utils/whatsapp.php';
                $msg = "⚠️ *Low Stock Alert (Updated)* ⚠️\n\nProduct: *{$productName}*\nRemaining Qty: *{$newQuantity} {$unit}*\n\nPlease replenish the stock.";
                sendWhatsAppAlert($msg);
                
                // SMS Alert
                require_once __DIR__ . '/../utils/sms.php';
                $smsMsg = "Low Stock Alert (Updated): Product {$productName}, Remaining Qty: {$newQuantity} {$unit}. Please replenish.";
                sendSMSAlert($smsMsg);
            }
        }
        
        $formatted = [
            'id' => (int)$row['id'],
            'productId' => (int)$row['productId'],
            'quantity' => (float)$row['quantity'],
            'rate' => (float)$row['rate'],
            'createdAt' => $row['createdAt'],
            'updatedAt' => $row['updatedAt'],
            'product' => [
                'id' => (int)$row['productId'],
                'productName' => $row['productName'],
                'unit' => $row['unit']
            ]
        ];
        
        sendResponse(true, 'Stock updated successfully', $formatted);
    } catch (PDOException $e) {
        sendResponse(false, 'Database error: ' . $e->getMessage(), null, 500);
    }
}

/**
 * Handle PATCH /api/stocks/:id/adjust
 */
function adjustStock($stockId) {
    $body = getJsonInput();
    $adjustment = isset($body['adjustment']) ? (float)$body['adjustment'] : null;
    $reason = $body['reason'] ?? 'Manual adjustment';
    
    if ($adjustment === null) {
        sendResponse(false, 'Adjustment value is required', null, 400);
    }
    
    $db = getDatabaseConnection();
    try {
        // Fetch current stock
        $stmt = $db->prepare("SELECT s.id, s.product_id as productId, s.quantity, s.rate, s.createdAt, s.updatedAt,
                                     p.product_name as productName, p.unit
                              FROM stocks s
                              JOIN products p ON s.product_id = p.id
                              WHERE s.id = :id LIMIT 1");
        $stmt->execute(['id' => $stockId]);
        $row = $stmt->fetch();
        
        if (!$row) {
            sendResponse(false, 'Stock not found', null, 404);
        }
        
        $prevQuantity = (float)$row['quantity'];
        $newQuantity = max(0.0, $prevQuantity + $adjustment);
        
        // Update stock
        $stmt = $db->prepare("UPDATE stocks SET quantity = :quantity, updatedAt = NOW() WHERE id = :id");
        $stmt->execute(['quantity' => $newQuantity, 'id' => $stockId]);
        
        // Check for low stock threshold transition
        $threshStmt = $db->query("SELECT setting_value FROM settings WHERE setting_key = 'low_stock_threshold'");
        $threshold = (float)($threshStmt->fetchColumn() ?: 20.0);
        
        if ($prevQuantity > $threshold && $newQuantity <= $threshold) {
            $productName = $row['productName'];
            $unit = $row['unit'];
            
            // WhatsApp Alert
            require_once __DIR__ . '/../utils/whatsapp.php';
            $msg = "⚠️ *Low Stock Alert (Adjusted)* ⚠️\n\nProduct: *{$productName}*\nRemaining Qty: *{$newQuantity} {$unit}*\n\nPlease replenish the stock.";
            sendWhatsAppAlert($msg);
            
            // SMS Alert
            require_once __DIR__ . '/../utils/sms.php';
            $smsMsg = "Low Stock Alert (Adjusted): Product {$productName}, Remaining Qty: {$newQuantity} {$unit}. Please replenish.";
            sendSMSAlert($smsMsg);
        }
        
        $data = [
            'id' => (int)$row['id'],
            'productId' => (int)$row['productId'],
            'quantity' => $newQuantity,
            'rate' => (float)$row['rate'],
            'createdAt' => $row['createdAt'],
            'updatedAt' => date('Y-m-d H:i:s'),
            'adjustment' => $adjustment,
            'reason' => $reason,
            'previousQuantity' => $prevQuantity,
            'product' => [
                'id' => (int)$row['productId'],
                'productName' => $row['productName'],
                'unit' => $row['unit']
            ]
        ];
        
        $msg = $adjustment > 0 ? 'increased' : 'decreased';
        sendResponse(true, "Stock {$msg} successfully", $data);
    } catch (PDOException $e) {
        sendResponse(false, 'Database error: ' . $e->getMessage(), null, 500);
    }
}

/**
 * Handle DELETE /api/stocks/:id
 */
function deleteStock($stockId) {
    $db = getDatabaseConnection();
    try {
        // Check if exists
        $stmt = $db->prepare("SELECT id FROM stocks WHERE id = :id LIMIT 1");
        $stmt->execute(['id' => $stockId]);
        if (!$stmt->fetch()) {
            sendResponse(false, 'Stock not found', null, 404);
        }
        
        $stmt = $db->prepare("DELETE FROM stocks WHERE id = :id");
        $stmt->execute(['id' => $stockId]);
        
        sendResponse(true, 'Stock deleted successfully');
    } catch (PDOException $e) {
        sendResponse(false, 'Database error: ' . $e->getMessage(), null, 500);
    }
}

/**
 * Handle GET /api/stocks/alerts/low-stock
 */
function getLowStockAlerts() {
    $threshold = isset($_GET['threshold']) ? (int)$_GET['threshold'] : 10;
    
    $db = getDatabaseConnection();
    try {
        $stmt = $db->prepare("SELECT s.id, s.product_id as productId, s.quantity, s.rate, s.createdAt, s.updatedAt,
                                     p.product_name as productName, p.unit
                              FROM stocks s
                              JOIN products p ON s.product_id = p.id
                              WHERE s.quantity <= :threshold
                              ORDER BY s.quantity ASC");
        $stmt->bindValue(':threshold', $threshold, PDO::PARAM_INT);
        $stmt->execute();
        $rows = $stmt->fetchAll();
        
        $lowStockItems = [];
        foreach ($rows as $row) {
            $lowStockItems[] = [
                'id' => (int)$row['id'],
                'productId' => (int)$row['productId'],
                'quantity' => (float)$row['quantity'],
                'rate' => (float)$row['rate'],
                'createdAt' => $row['createdAt'],
                'updatedAt' => $row['updatedAt'],
                'product' => [
                    'id' => (int)$row['productId'],
                    'productName' => $row['productName'],
                    'unit' => $row['unit']
                ]
            ];
        }
        
        echo json_encode([
            'success' => true,
            'data' => $lowStockItems,
            'meta' => [
                'threshold' => $threshold,
                'count' => count($lowStockItems)
            ]
        ]);
        exit;
    } catch (PDOException $e) {
        sendResponse(false, 'Database error: ' . $e->getMessage(), null, 500);
    }
}
