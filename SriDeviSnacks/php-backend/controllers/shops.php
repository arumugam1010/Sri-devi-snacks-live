<?php
/**
 * Shops Controller
 */

function handleShopsRoute($parts, $method) {
    // Authenticate user
    getAuthenticatedUser();
    
    $action = $parts[1] ?? '';
    
    if (empty($action)) {
        if ($method === 'GET') {
            getShopsList();
        } elseif ($method === 'POST') {
            createShop();
        } else {
            sendResponse(false, 'Method not allowed', null, 405);
        }
        return;
    }
    
    if ($action === 'all-products') {
        if ($method === 'GET') {
            getAllShopProducts();
        } else {
            sendResponse(false, 'Method not allowed', null, 405);
        }
        return;
    }
    
    if (is_numeric($action)) {
        $shopId = (int)$action;
        $subAction = $parts[2] ?? '';
        
        if (empty($subAction)) {
            if ($method === 'GET') {
                getShopById($shopId);
            } elseif ($method === 'PUT') {
                updateShop($shopId);
            } elseif ($method === 'DELETE') {
                deleteShop($shopId);
            } else {
                sendResponse(false, 'Method not allowed', null, 405);
            }
        } elseif ($subAction === 'products' && $method === 'GET') {
            getShopProducts($shopId);
        } else {
            sendResponse(false, 'Action not found', null, 404);
        }
        return;
    }
    
    sendResponse(false, 'Action not found in shops', null, 404);
}

/**
 * Handle GET /api/shops
 */
function getShopsList() {
    $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
    $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 10;
    $search = isset($_GET['search']) ? $_GET['search'] : '';
    $sortBy = isset($_GET['sortBy']) ? $_GET['sortBy'] : 'createdAt';
    $sortOrder = isset($_GET['sortOrder']) && strtolower($_GET['sortOrder']) === 'asc' ? 'asc' : 'desc';
    
    // Map JS camelCase sort fields to SQL column names
    $sortFieldMap = [
        'id' => 'id',
        'shopName' => 'shop_name',
        'address' => 'address',
        'contact' => 'contact',
        'status' => 'status',
        'createdAt' => 'createdAt',
        'updatedAt' => 'updatedAt'
    ];
    $sortBySql = $sortFieldMap[$sortBy] ?? 'createdAt';
    
    $offset = ($page - 1) * $limit;
    
    $db = getDatabaseConnection();
    try {
        $whereSql = "";
        $params = [];
        
        if ($search !== '') {
            $whereSql = "WHERE shop_name LIKE :search1 OR address LIKE :search2 OR contact LIKE :search3";
            $params['search1'] = '%' . $search . '%';
            $params['search2'] = '%' . $search . '%';
            $params['search3'] = '%' . $search . '%';
        }
        
        // Count total
        $countStmt = $db->prepare("SELECT COUNT(*) FROM shops {$whereSql}");
        $countStmt->execute($params);
        $total = (int)$countStmt->fetchColumn();
        
        // Get Shops
        $querySql = "SELECT id, shop_name as shopName, address, contact, email, gst_number as gstNumber, status, createdAt, updatedAt 
                     FROM shops 
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
        $shops = $stmt->fetchAll();
        
        if (!empty($shops)) {
            $shopIds = array_column($shops, 'id');
            $shopIdsStr = implode(',', $shopIds);
            
            // Fetch Schedules
            $schedulesStmt = $db->query("SELECT id, shop_id, day_of_week as dayOfWeek, isActive, createdAt, updatedAt 
                                         FROM schedules 
                                         WHERE shop_id IN ({$shopIdsStr})");
            $schedules = $schedulesStmt->fetchAll();
            $schedulesByShop = [];
            foreach ($schedules as $sched) {
                $sched['id'] = (int)$sched['id'];
                $sched['shop_id'] = (int)$sched['shop_id'];
                $sched['isActive'] = (bool)$sched['isActive'];
                $schedulesByShop[$sched['shop_id']][] = $sched;
            }
            
            // Fetch Shop Products with Product Details
            $productsStmt = $db->query("SELECT sp.id, sp.shop_id, sp.product_id, sp.price, sp.createdAt, sp.updatedAt,
                                               p.product_name as productName, p.unit, p.hsn_code as hsnCode, p.gst, p.price as defaultPrice, p.createdAt as p_createdAt, p.updatedAt as p_updatedAt
                                        FROM shop_products sp
                                        JOIN products p ON sp.product_id = p.id
                                        WHERE sp.shop_id IN ({$shopIdsStr})");
            $shopProducts = $productsStmt->fetchAll();
            $productsByShop = [];
            foreach ($shopProducts as $sp) {
                $shopIdKey = (int)$sp['shop_id'];
                $productsByShop[$shopIdKey][] = [
                    'id' => (int)$sp['id'],
                    'shopId' => $shopIdKey,
                    'productId' => (int)$sp['product_id'],
                    'price' => (float)$sp['price'],
                    'createdAt' => $sp['createdAt'],
                    'updatedAt' => $sp['updatedAt'],
                    'product' => [
                        'id' => (int)$sp['product_id'],
                        'productName' => $sp['productName'],
                        'unit' => $sp['unit'],
                        'hsnCode' => $sp['hsnCode'],
                        'gst' => (float)$sp['gst'],
                        'price' => (float)$sp['defaultPrice'],
                        'createdAt' => $sp['p_createdAt'],
                        'updatedAt' => $sp['p_updatedAt']
                    ]
                ];
            }
            
            // Fetch Bills Counts
            $billsStmt = $db->query("SELECT shop_id, COUNT(*) as billsCount FROM bills WHERE shop_id IN ({$shopIdsStr}) GROUP BY shop_id");
            $billsCounts = [];
            while ($row = $billsStmt->fetch()) {
                $billsCounts[(int)$row['shop_id']] = (int)$row['billsCount'];
            }
            
            // Merge relations back to shops array
            foreach ($shops as &$shop) {
                $shop['id'] = (int)$shop['id'];
                $shop['shopProducts'] = $productsByShop[$shop['id']] ?? [];
                $shop['schedules'] = $schedulesByShop[$shop['id']] ?? [];
                $shop['_count'] = [
                    'bills' => $billsCounts[$shop['id']] ?? 0
                ];
            }
        }
        
        $totalPages = ceil($total / $limit);
        
        echo json_encode([
            'success' => true,
            'data' => $shops,
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
 * Handle GET /api/shops/:id
 */
function getShopById($shopId) {
    $db = getDatabaseConnection();
    try {
        // Fetch base shop
        $stmt = $db->prepare("SELECT id, shop_name as shopName, address, contact, email, gst_number as gstNumber, status, createdAt, updatedAt 
                              FROM shops 
                              WHERE id = :id LIMIT 1");
        $stmt->execute(['id' => $shopId]);
        $shop = $stmt->fetch();
        
        if (!$shop) {
            sendResponse(false, 'Shop not found', null, 404);
        }
        
        $shop['id'] = (int)$shop['id'];
        
        // Fetch schedules
        $stmt = $db->prepare("SELECT id, shop_id as shopId, day_of_week as dayOfWeek, isActive, createdAt, updatedAt 
                              FROM schedules 
                              WHERE shop_id = :shop_id");
        $stmt->execute(['shop_id' => $shopId]);
        $schedules = $stmt->fetchAll();
        foreach ($schedules as &$sched) {
            $sched['id'] = (int)$sched['id'];
            $sched['shopId'] = (int)$sched['shopId'];
            $sched['isActive'] = (bool)$sched['isActive'];
        }
        $shop['schedules'] = $schedules;
        
        // Fetch shop products
        $stmt = $db->prepare("SELECT sp.id, sp.shop_id as shopId, sp.product_id as productId, sp.price, sp.createdAt, sp.updatedAt,
                                     p.product_name as productName, p.unit, p.hsn_code as hsnCode, p.gst, p.price as defaultPrice, p.createdAt as p_createdAt, p.updatedAt as p_updatedAt
                              FROM shop_products sp
                              JOIN products p ON sp.product_id = p.id
                              WHERE sp.shop_id = :shop_id");
        $stmt->execute(['shop_id' => $shopId]);
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
                'product' => [
                    'id' => (int)$sp['productId'],
                    'productName' => $sp['productName'],
                    'unit' => $sp['unit'],
                    'hsnCode' => $sp['hsnCode'],
                    'gst' => (float)$sp['gst'],
                    'price' => (float)$sp['defaultPrice'],
                    'createdAt' => $sp['p_createdAt'],
                    'updatedAt' => $sp['p_updatedAt']
                ]
            ];
        }
        $shop['shopProducts'] = $formattedShopProducts;
        
        // Fetch 10 recent bills
        $stmt = $db->prepare("SELECT id, bill_number as billNumber, shop_id as shopId, user_id as userId, bill_date as billDate,
                                     total_amount as totalAmount, received_amount as receivedAmount, pending_amount as pendingAmount, status, notes, signature, createdAt, updatedAt
                              FROM bills 
                              WHERE shop_id = :shop_id 
                              ORDER BY createdAt DESC LIMIT 10");
        $stmt->execute(['shop_id' => $shopId]);
        $bills = $stmt->fetchAll();
        
        if (!empty($bills)) {
            $billIds = array_column($bills, 'id');
            $billIdsStr = implode(',', $billIds);
            
            // Fetch bill items
            $itemsStmt = $db->query("SELECT bi.id, bi.bill_id as billId, bi.product_id as productId, bi.quantity, bi.rate, bi.amount, bi.sgst, bi.cgst, bi.hsn_code as hsnCode, bi.createdAt,
                                            p.product_name as productName, p.unit
                                     FROM bill_items bi
                                     JOIN products p ON bi.product_id = p.id
                                     WHERE bi.bill_id IN ({$billIdsStr})");
            $items = $itemsStmt->fetchAll();
            $itemsByBill = [];
            foreach ($items as $item) {
                $billIdKey = (int)$item['billId'];
                $itemsByBill[$billIdKey][] = [
                    'id' => (int)$item['id'],
                    'billId' => $billIdKey,
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
                        'unit' => $item['unit']
                    ]
                ];
            }
            
            foreach ($bills as &$bill) {
                $bill['id'] = (int)$bill['id'];
                $bill['shopId'] = (int)$bill['shopId'];
                $bill['userId'] = (int)$bill['userId'];
                $bill['totalAmount'] = (float)$bill['totalAmount'];
                $bill['receivedAmount'] = (float)$bill['receivedAmount'];
                $bill['pendingAmount'] = (float)$bill['pendingAmount'];
                $bill['billItems'] = $itemsByBill[$bill['id']] ?? [];
            }
        }
        $shop['bills'] = $bills;
        
        // Bills count
        $stmt = $db->prepare("SELECT COUNT(*) FROM bills WHERE shop_id = :shop_id");
        $stmt->execute(['shop_id' => $shopId]);
        $shop['_count'] = [
            'bills' => (int)$stmt->fetchColumn()
        ];
        
        sendResponse(true, '', $shop);
        
    } catch (PDOException $e) {
        sendResponse(false, 'Database error: ' . $e->getMessage(), null, 500);
    }
}

/**
 * Handle POST /api/shops
 */
function createShop() {
    $body = getJsonInput();
    $shopName = $body['shopName'] ?? '';
    $address = $body['address'] ?? '';
    $contact = $body['contact'] ?? '';
    $email = $body['email'] ?? null;
    $gstNumber = $body['gstNumber'] ?? null;
    $status = $body['status'] ?? 'ACTIVE';
    
    if (empty($shopName) || empty($address) || empty($contact)) {
        sendResponse(false, 'Shop Name, Address and Contact are required', null, 400);
    }
    
    $db = getDatabaseConnection();
    try {
        // Check if a shop with the same name already exists
        $checkStmt = $db->prepare("SELECT id FROM shops WHERE LOWER(TRIM(shop_name)) = LOWER(TRIM(:shop_name)) LIMIT 1");
        $checkStmt->execute(['shop_name' => $shopName]);
        if ($checkStmt->fetch()) {
            sendResponse(false, 'A shop with this name already exists', null, 400);
            return;
        }

        $stmt = $db->prepare("INSERT INTO shops (shop_name, address, contact, email, gst_number, status, createdAt, updatedAt) 
                              VALUES (:shop_name, :address, :contact, :email, :gst_number, :status, NOW(), NOW())");
        $stmt->execute([
            'shop_name' => $shopName,
            'address' => $address,
            'contact' => $contact,
            'email' => $email,
            'gst_number' => $gstNumber,
            'status' => $status
        ]);
        
        $shopId = (int)$db->lastInsertId();
        
        // Fetch new shop
        $stmt = $db->prepare("SELECT id, shop_name as shopName, address, contact, email, gst_number as gstNumber, status, createdAt, updatedAt 
                              FROM shops WHERE id = :id");
        $stmt->execute(['id' => $shopId]);
        $shop = $stmt->fetch();
        
        $shop['id'] = (int)$shop['id'];
        $shop['shopProducts'] = [];
        $shop['schedules'] = [];
        
        sendResponse(true, 'Shop created successfully', $shop, 201);
    } catch (PDOException $e) {
        sendResponse(false, 'Database error: ' . $e->getMessage(), null, 500);
    }
}

/**
 * Handle PUT /api/shops/:id
 */
function updateShop($shopId) {
    $body = getJsonInput();
    
    $db = getDatabaseConnection();
    try {
        // Check if shop exists
        $stmt = $db->prepare("SELECT id FROM shops WHERE id = :id LIMIT 1");
        $stmt->execute(['id' => $shopId]);
        if (!$stmt->fetch()) {
            sendResponse(false, 'Shop not found', null, 404);
        }

        // Check if shopName is being updated and already exists
        if (isset($body['shopName'])) {
            $checkStmt = $db->prepare("SELECT id FROM shops WHERE LOWER(TRIM(shop_name)) = LOWER(TRIM(:shop_name)) AND id != :id LIMIT 1");
            $checkStmt->execute(['shop_name' => $body['shopName'], 'id' => $shopId]);
            if ($checkStmt->fetch()) {
                sendResponse(false, 'A shop with this name already exists', null, 400);
                return;
            }
        }
        
        // Prepare dynamic update columns
        $updates = [];
        $params = ['id' => $shopId];
        
        $fields = [
            'shopName' => 'shop_name',
            'address' => 'address',
            'contact' => 'contact',
            'email' => 'email',
            'gstNumber' => 'gst_number',
            'status' => 'status'
        ];
        
        foreach ($fields as $bodyKey => $dbCol) {
            if (isset($body[$bodyKey])) {
                $updates[] = "{$dbCol} = :{$bodyKey}";
                $params[$bodyKey] = $body[$bodyKey];
            }
        }
        
        if (empty($updates)) {
            sendResponse(false, 'No fields to update', null, 400);
        }
        
        $updates[] = "updatedAt = NOW()";
        $updatesStr = implode(', ', $updates);
        
        $stmt = $db->prepare("UPDATE shops SET {$updatesStr} WHERE id = :id");
        $stmt->execute($params);
        
        // Fetch updated shop
        $stmt = $db->prepare("SELECT id, shop_name as shopName, address, contact, email, gst_number as gstNumber, status, createdAt, updatedAt 
                              FROM shops WHERE id = :id");
        $stmt->execute(['id' => $shopId]);
        $shop = $stmt->fetch();
        
        $shop['id'] = (int)$shop['id'];
        
        // Fetch schedules
        $stmt = $db->prepare("SELECT id, shop_id as shopId, day_of_week as dayOfWeek, isActive, createdAt, updatedAt 
                              FROM schedules WHERE shop_id = :shop_id");
        $stmt->execute(['shop_id' => $shopId]);
        $shop['schedules'] = $stmt->fetchAll();
        foreach ($shop['schedules'] as &$sched) {
            $sched['id'] = (int)$sched['id'];
            $sched['shopId'] = (int)$sched['shopId'];
            $sched['isActive'] = (bool)$sched['isActive'];
        }
        
        // Fetch shop products
        $stmt = $db->prepare("SELECT id, shop_id as shopId, product_id as productId, price, createdAt, updatedAt 
                              FROM shop_products WHERE shop_id = :shop_id");
        $stmt->execute(['shop_id' => $shopId]);
        $shop['shopProducts'] = $stmt->fetchAll();
        foreach ($shop['shopProducts'] as &$sp) {
            $sp['id'] = (int)$sp['id'];
            $sp['shopId'] = (int)$sp['shopId'];
            $sp['productId'] = (int)$sp['productId'];
            $sp['price'] = (float)$sp['price'];
        }
        
        sendResponse(true, 'Shop updated successfully', $shop);
    } catch (PDOException $e) {
        sendResponse(false, 'Database error: ' . $e->getMessage(), null, 500);
    }
}

/**
 * Handle DELETE /api/shops/:id
 */
function deleteShop($shopId) {
    $db = getDatabaseConnection();
    try {
        // Check if shop exists
        $stmt = $db->prepare("SELECT id FROM shops WHERE id = :id LIMIT 1");
        $stmt->execute(['id' => $shopId]);
        if (!$stmt->fetch()) {
            sendResponse(false, 'Shop not found', null, 404);
        }
        
        // Check if shop has bills
        $stmt = $db->prepare("SELECT COUNT(*) FROM bills WHERE shop_id = :shop_id");
        $stmt->execute(['shop_id' => $shopId]);
        $billCount = (int)$stmt->fetchColumn();
        
        if ($billCount > 0) {
            sendResponse(false, 'Cannot delete shop with existing bills. Deactivate instead.', null, 409);
        }
        
        $stmt = $db->prepare("DELETE FROM shops WHERE id = :id");
        $stmt->execute(['id' => $shopId]);
        
        sendResponse(true, 'Shop deleted successfully');
    } catch (PDOException $e) {
        sendResponse(false, 'Database error: ' . $e->getMessage(), null, 500);
    }
}

/**
 * Handle GET /api/shops/:id/products
 */
function getShopProducts($shopId) {
    $db = getDatabaseConnection();
    try {
        // Verify shop exists
        $stmt = $db->prepare("SELECT id FROM shops WHERE id = :id LIMIT 1");
        $stmt->execute(['id' => $shopId]);
        if (!$stmt->fetch()) {
            sendResponse(false, 'Shop not found', null, 404);
        }
        
        // Fetch products mapping
        $stmt = $db->prepare("SELECT sp.id, sp.shop_id as shopId, sp.product_id as productId, sp.price, sp.createdAt, sp.updatedAt,
                                     p.product_name as productName, p.unit, p.hsn_code as hsnCode, p.gst, p.price as defaultPrice, p.createdAt as p_createdAt, p.updatedAt as p_updatedAt,
                                     s.id as stockId, s.quantity as stockQuantity, s.rate as stockRate
                              FROM shop_products sp
                              JOIN products p ON sp.product_id = p.id
                              LEFT JOIN stocks s ON p.id = s.product_id
                              WHERE sp.shop_id = :shop_id
                              ORDER BY CASE p.product_name 
                                WHEN 'நெய் முறுக்கு' THEN 1
                                WHEN 'நெய் சில்லி முறுக்கு' THEN 2
                                WHEN 'தேன் குழல் முறுக்கு' THEN 3
                                WHEN 'தேன் குழல் சில்லி முறுக்கு' THEN 4
                                WHEN 'பூண்டு முறுக்கு' THEN 5
                                WHEN 'பூண்டு சில்லி முறுக்கு' THEN 6
                                WHEN 'தேங்காய் பால் முறுக்கு' THEN 7
                                WHEN 'தட்டை' THEN 8
                                WHEN 'அச்சி முறுக்கு' THEN 9
                                WHEN 'மிக்சர்' THEN 10
                                WHEN 'சேவு' THEN 11
                                WHEN 'சீவல்' THEN 12
                                WHEN 'பம்பாய் மிக்சர்' THEN 13
                                WHEN 'ஓமப்பொடி' THEN 14
                                WHEN 'ஆந்திரா முறுக்கு' THEN 15
                                WHEN 'பொரி மிக்சர்' THEN 16
                                WHEN 'காராபூந்தி' THEN 17
                                WHEN 'கை சுத்து முறுக்கு' THEN 18
                                WHEN 'தேன் மிட்டாய்' THEN 19
                                WHEN 'கடலை மிட்டாய்' THEN 20
                                WHEN 'சீடை' THEN 21
                                WHEN 'வாழைக்காய் சிப்ஸ்' THEN 22
                                WHEN 'கிழங்கு குச்சி' THEN 23
                                WHEN 'கிழங்கு சிப்ஸ்' THEN 24
                                WHEN 'பழம் சிப்ஸ்' THEN 25
                                WHEN 'உருளைக்கிழங்கு சிப்ஸ் (Lays)' THEN 26
                                WHEN 'மஸ்கோத் ஹல்வா' THEN 27
                                WHEN 'தேங்காய் பர்பி' THEN 28
                                WHEN 'இனிப்பு காரசேவு' THEN 29
                                WHEN 'பன்' THEN 30
                                WHEN 'கிரீம் பன்' THEN 31
                                WHEN 'தேங்காய் பன்' THEN 32
                                WHEN 'பிரெட்' THEN 33
                                WHEN 'தேங்காய் பன் (தோசை பன்)' THEN 34
                                WHEN 'காரி' THEN 35
                                WHEN '4 பன்' THEN 36
                                WHEN 'ஜாம் பன்' THEN 37
                                ELSE 999 
                              END ASC");
        $stmt->execute(['shop_id' => $shopId]);
        $rows = $stmt->fetchAll();
        
        $formatted = [];
        foreach ($rows as $row) {
            $stocks = [];
            if ($row['stockId'] !== null) {
                $stocks[] = [
                    'id' => (int)$row['stockId'],
                    'productId' => (int)$row['productId'],
                    'quantity' => (int)$row['stockQuantity'],
                    'rate' => (float)$row['stockRate']
                ];
            }
            
            $formatted[] = [
                'id' => (int)$row['id'],
                'shopId' => (int)$row['shopId'],
                'productId' => (int)$row['productId'],
                'price' => (float)$row['price'],
                'createdAt' => $row['createdAt'],
                'updatedAt' => $row['updatedAt'],
                'product' => [
                    'id' => (int)$row['productId'],
                    'productName' => $row['productName'],
                    'unit' => $row['unit'],
                    'hsnCode' => $row['hsnCode'],
                    'gst' => (float)$row['gst'],
                    'price' => (float)$row['defaultPrice'],
                    'createdAt' => $row['p_createdAt'],
                    'updatedAt' => $row['p_updatedAt'],
                    'stocks' => $stocks
                ]
            ];
        }
        
        sendResponse(true, '', $formatted);
    } catch (PDOException $e) {
        sendResponse(false, 'Database error: ' . $e->getMessage(), null, 500);
    }
}

/**
 * Handle GET /api/shops/all-products
 */
function getAllShopProducts() {
    $db = getDatabaseConnection();
    try {
        $stmt = $db->prepare("SELECT sp.id, sp.shop_id as shopId, sp.product_id as productId, sp.price, sp.createdAt, sp.updatedAt,
                                     p.product_name as productName, p.unit, p.hsn_code as hsnCode, p.gst, p.price as defaultPrice, p.createdAt as p_createdAt, p.updatedAt as p_updatedAt,
                                     s.id as stockId, s.quantity as stockQuantity, s.rate as stockRate,
                                     sh.shop_name as shopName
                              FROM shop_products sp
                              JOIN products p ON sp.product_id = p.id
                              JOIN shops sh ON sp.shop_id = sh.id
                              LEFT JOIN stocks s ON p.id = s.product_id
                              ORDER BY CASE p.product_name 
                                WHEN 'நெய் முறுக்கு' THEN 1
                                WHEN 'நெய் சில்லி முறுக்கு' THEN 2
                                WHEN 'தேன் குழல் முறுக்கு' THEN 3
                                WHEN 'தேன் குழல் சில்லி முறுக்கு' THEN 4
                                WHEN 'பூண்டு முறுக்கு' THEN 5
                                WHEN 'பூண்டு சில்லி முறுக்கு' THEN 6
                                WHEN 'தேங்காய் பால் முறுக்கு' THEN 7
                                WHEN 'தட்டை' THEN 8
                                WHEN 'அச்சி முறுக்கு' THEN 9
                                WHEN 'மிக்சர்' THEN 10
                                WHEN 'சேவு' THEN 11
                                WHEN 'சீவல்' THEN 12
                                WHEN 'பம்பாய் மிக்சர்' THEN 13
                                WHEN 'ஓமப்பொடி' THEN 14
                                WHEN 'ஆந்திரா முறுக்கு' THEN 15
                                WHEN 'பொரி மிக்சர்' THEN 16
                                WHEN 'காராபூந்தி' THEN 17
                                WHEN 'கை சுத்து முறுக்கு' THEN 18
                                WHEN 'தேன் மிட்டாய்' THEN 19
                                WHEN 'கடலை மிட்டாய்' THEN 20
                                WHEN 'சீடை' THEN 21
                                WHEN 'வாழைக்காய் சிப்ஸ்' THEN 22
                                WHEN 'கிழங்கு குச்சி' THEN 23
                                WHEN 'கிழங்கு சிப்ஸ்' THEN 24
                                WHEN 'பழம் சிப்ஸ்' THEN 25
                                WHEN 'உருளைக்கிழங்கு சிப்ஸ் (Lays)' THEN 26
                                WHEN 'மஸ்கோத் ஹல்வா' THEN 27
                                WHEN 'தேங்காய் பர்பி' THEN 28
                                WHEN 'இனிப்பு காரசேவு' THEN 29
                                WHEN 'பன்' THEN 30
                                WHEN 'கிரீம் பன்' THEN 31
                                WHEN 'தேங்காய் பன்' THEN 32
                                WHEN 'பிரெட்' THEN 33
                                WHEN 'தேங்காய் பன் (தோசை பன்)' THEN 34
                                WHEN 'காரி' THEN 35
                                WHEN '4 பன்' THEN 36
                                WHEN 'ஜாம் பன்' THEN 37
                                ELSE 999 
                              END ASC");
        $stmt->execute();
        $rows = $stmt->fetchAll();
        
        $formatted = [];
        foreach ($rows as $row) {
            $stocks = [];
            if ($row['stockId'] !== null) {
                $stocks[] = [
                    'id' => (int)$row['stockId'],
                    'productId' => (int)$row['productId'],
                    'quantity' => (int)$row['stockQuantity'],
                    'rate' => (float)$row['stockRate']
                ];
            }
            
            $formatted[] = [
                'id' => (int)$row['id'],
                'shopId' => (int)$row['shopId'],
                'productId' => (int)$row['productId'],
                'price' => (float)$row['price'],
                'createdAt' => $row['createdAt'],
                'updatedAt' => $row['updatedAt'],
                'shop' => [
                    'id' => (int)$row['shopId'],
                    'shopName' => $row['shopName']
                ],
                'product' => [
                    'id' => (int)$row['productId'],
                    'productName' => $row['productName'],
                    'unit' => $row['unit'],
                    'hsnCode' => $row['hsnCode'],
                    'gst' => (float)$row['gst'],
                    'price' => (float)$row['defaultPrice'],
                    'createdAt' => $row['p_createdAt'],
                    'updatedAt' => $row['p_updatedAt'],
                    'stocks' => $stocks
                ]
            ];
        }
        
        sendResponse(true, '', $formatted);
    } catch (PDOException $e) {
        sendResponse(false, 'Database error: ' . $e->getMessage(), null, 500);
    }
}
