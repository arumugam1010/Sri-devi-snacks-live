<?php
/**
 * Products Controller
 */

function handleProductsRoute($parts, $method) {
    getAuthenticatedUser();
    
    $action = $parts[1] ?? '';
    
    // POST/PUT/DELETE /products/shop-pricing
    if ($action === 'shop-pricing') {
        $subAction = $parts[2] ?? '';
        if (empty($subAction)) {
            if ($method === 'POST') {
                createShopProductPricing();
            } else {
                sendResponse(false, 'Method not allowed', null, 405);
            }
        } elseif (is_numeric($subAction)) {
            $pricingId = (int)$subAction;
            if ($method === 'PUT') {
                updateShopProductPricing($pricingId);
            } elseif ($method === 'DELETE') {
                deleteShopProductPricing($pricingId);
            } else {
                sendResponse(false, 'Method not allowed', null, 405);
            }
        } else {
            sendResponse(false, 'Action not found', null, 404);
        }
        return;
    }
    
    // GET /products or POST /products
    if (empty($action)) {
        if ($method === 'GET') {
            getProductsList();
        } elseif ($method === 'POST') {
            createProduct();
        } else {
            sendResponse(false, 'Method not allowed', null, 405);
        }
        return;
    }
    
    // Product details by numeric ID
    if (is_numeric($action)) {
        $productId = (int)$action;
        if ($method === 'GET') {
            getProductById($productId);
        } elseif ($method === 'PUT') {
            updateProduct($productId);
        } elseif ($method === 'DELETE') {
            deleteProduct($productId);
        } else {
            sendResponse(false, 'Method not allowed', null, 405);
        }
        return;
    }
    
    sendResponse(false, 'Action not found in products', null, 404);
}

/**
 * Handle GET /api/products
 */
function getProductsList() {
    $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
    $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 10;
    $search = isset($_GET['search']) ? $_GET['search'] : '';
    $sortBy = isset($_GET['sortBy']) ? $_GET['sortBy'] : 'createdAt';
    $sortOrder = isset($_GET['sortOrder']) && strtolower($_GET['sortOrder']) === 'asc' ? 'asc' : 'desc';
    
    // Map JS camelCase sort fields to SQL column names
    $sortFieldMap = [
        'id' => 'id',
        'productName' => 'product_name',
        'unit' => 'unit',
        'hsnCode' => 'hsn_code',
        'gst' => 'gst',
        'price' => 'price',
        'createdAt' => 'createdAt',
        'updatedAt' => 'updatedAt'
    ];
    
    if (empty($sortBy) || $sortBy === 'createdAt') {
        $sortBySql = "CASE product_name 
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
        END";
        $sortOrder = "ASC";
    } else {
        $sortBySql = $sortFieldMap[$sortBy] ?? 'createdAt';
    }
    
    $offset = ($page - 1) * $limit;
    
    $db = getDatabaseConnection();
    try {
        $whereSql = "";
        $params = [];
        
        if ($search !== '') {
            $whereSql = "WHERE product_name LIKE :search1 OR unit LIKE :search2 OR hsn_code LIKE :search3";
            $params['search1'] = '%' . $search . '%';
            $params['search2'] = '%' . $search . '%';
            $params['search3'] = '%' . $search . '%';
        }
        
        // Count total
        $countStmt = $db->prepare("SELECT COUNT(*) FROM products {$whereSql}");
        $countStmt->execute($params);
        $total = (int)$countStmt->fetchColumn();
        
        // Fetch products
        $querySql = "SELECT id, product_name as productName, unit, hsn_code as hsnCode, gst, price, image, createdAt, updatedAt 
                     FROM products 
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
        $products = $stmt->fetchAll();
        
        if (!empty($products)) {
            $productIds = array_column($products, 'id');
            $productIdsStr = implode(',', $productIds);
            
            // Fetch Stocks
            $stocksStmt = $db->query("SELECT id, product_id as productId, quantity, rate, createdAt, updatedAt 
                                      FROM stocks WHERE product_id IN ({$productIdsStr})");
            $stocks = $stocksStmt->fetchAll();
            $stocksByProduct = [];
            foreach ($stocks as $st) {
                $st['id'] = (int)$st['id'];
                $st['productId'] = (int)$st['productId'];
                $st['quantity'] = (float)$st['quantity'];
                $st['rate'] = (float)$st['rate'];
                $stocksByProduct[$st['productId']][] = $st;
            }
            
            // Fetch Shop Products mapping
            $shopProdStmt = $db->query("SELECT sp.id, sp.shop_id as shopId, sp.product_id as productId, sp.price, sp.createdAt, sp.updatedAt,
                                               s.shop_name as shopName, s.address, s.contact, s.email, s.gst_number as gstNumber, s.status, s.createdAt as s_createdAt, s.updatedAt as s_updatedAt
                                        FROM shop_products sp
                                        JOIN shops s ON sp.shop_id = s.id
                                        WHERE sp.product_id IN ({$productIdsStr})");
            $shopProducts = $shopProdStmt->fetchAll();
            $shopProductsByProduct = [];
            foreach ($shopProducts as $sp) {
                $prodIdKey = (int)$sp['productId'];
                $shopProductsByProduct[$prodIdKey][] = [
                    'id' => (int)$sp['id'],
                    'shopId' => (int)$sp['shopId'],
                    'productId' => $prodIdKey,
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
                        'status' => $sp['status'],
                        'createdAt' => $sp['s_createdAt'],
                        'updatedAt' => $sp['s_updatedAt']
                    ]
                ];
            }
            
            // Fetch BillItems counts
            $countsStmt = $db->query("SELECT product_id, COUNT(*) as billItemsCount FROM bill_items WHERE product_id IN ({$productIdsStr}) GROUP BY product_id");
            $billItemsCounts = [];
            while ($row = $countsStmt->fetch()) {
                $billItemsCounts[(int)$row['product_id']] = (int)$row['billItemsCount'];
            }
            
            // Map together
            foreach ($products as &$prod) {
                $prod['id'] = (int)$prod['id'];
                $prod['gst'] = (float)$prod['gst'];
                $prod['price'] = (float)$prod['price'];
                $prod['stocks'] = $stocksByProduct[$prod['id']] ?? [];
                $prod['shopProducts'] = $shopProductsByProduct[$prod['id']] ?? [];
                $prod['_count'] = [
                    'billItems' => $billItemsCounts[$prod['id']] ?? 0
                ];
            }
        }
        
        $totalPages = ceil($total / $limit);
        
        echo json_encode([
            'success' => true,
            'data' => $products,
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
 * Handle GET /api/products/:id
 */
function getProductById($productId) {
    $db = getDatabaseConnection();
    try {
        // Fetch product
        $stmt = $db->prepare("SELECT id, product_name as productName, unit, hsn_code as hsnCode, gst, price, image, createdAt, updatedAt 
                              FROM products WHERE id = :id LIMIT 1");
        $stmt->execute(['id' => $productId]);
        $prod = $stmt->fetch();
        
        if (!$prod) {
            sendResponse(false, 'Product not found', null, 404);
        }
        
        $prod['id'] = (int)$prod['id'];
        $prod['gst'] = (float)$prod['gst'];
        $prod['price'] = (float)$prod['price'];
        
        // Fetch stocks
        $stmt = $db->prepare("SELECT id, product_id as productId, quantity, rate, createdAt, updatedAt 
                              FROM stocks WHERE product_id = :product_id");
        $stmt->execute(['product_id' => $productId]);
        $stocks = $stmt->fetchAll();
        foreach ($stocks as &$st) {
            $st['id'] = (int)$st['id'];
            $st['productId'] = (int)$st['productId'];
            $st['quantity'] = (float)$st['quantity'];
            $st['rate'] = (float)$st['rate'];
        }
        $prod['stocks'] = $stocks;
        
        // Fetch shop products
        $stmt = $db->prepare("SELECT sp.id, sp.shop_id as shopId, sp.product_id as productId, sp.price, sp.createdAt, sp.updatedAt,
                                     s.shop_name as shopName, s.address, s.contact, s.email, s.gst_number as gstNumber, s.status, s.createdAt as s_createdAt, s.updatedAt as s_updatedAt
                              FROM shop_products sp
                              JOIN shops s ON sp.shop_id = s.id
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
                    'status' => $sp['status'],
                    'createdAt' => $sp['s_createdAt'],
                    'updatedAt' => $sp['s_updatedAt']
                ]
            ];
        }
        $prod['shopProducts'] = $formattedShopProducts;
        
        // Fetch 10 recent bill items
        $stmt = $db->prepare("SELECT bi.id, bi.bill_id as billId, bi.product_id as productId, bi.quantity, bi.rate, bi.amount, bi.sgst, bi.cgst, bi.hsn_code as hsnCode, bi.createdAt,
                                     b.bill_number as billNumber, b.bill_date as billDate, b.status as billStatus,
                                     s.id as shopId, s.shop_name as shopName
                              FROM bill_items bi
                              JOIN bills b ON bi.bill_id = b.id
                              JOIN shops s ON b.shop_id = s.id
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
        $prod['billItems'] = $formattedBillItems;
        
        // Count billItems
        $stmt = $db->prepare("SELECT COUNT(*) FROM bill_items WHERE product_id = :product_id");
        $stmt->execute(['product_id' => $productId]);
        $prod['_count'] = [
            'billItems' => (int)$stmt->fetchColumn()
        ];
        
        sendResponse(true, '', $prod);
        
    } catch (PDOException $e) {
        sendResponse(false, 'Database error: ' . $e->getMessage(), null, 500);
    }
}

/**
 * Handle POST /api/products
 */
function createProduct() {
    $body = getJsonInput();
    $productName = $body['productName'] ?? '';
    $unit = $body['unit'] ?? '';
    $hsnCode = $body['hsnCode'] ?? '';
    $gst = isset($body['gst']) ? (float)$body['gst'] : 5.0;
    $price = isset($body['price']) ? (float)$body['price'] : 0.0;
    $image = $body['image'] ?? null;
    
    if (empty($productName) || empty($unit) || empty($hsnCode)) {
        sendResponse(false, 'Product Name, Unit and HSN Code are required', null, 400);
    }
    
    $db = getDatabaseConnection();
    try {
        $stmt = $db->prepare("INSERT INTO products (product_name, unit, hsn_code, gst, price, image, createdAt, updatedAt) 
                              VALUES (:product_name, :unit, :hsn_code, :gst, :price, :image, NOW(), NOW())");
        $stmt->execute([
            'product_name' => $productName,
            'unit' => $unit,
            'hsn_code' => $hsnCode,
            'gst' => $gst,
            'price' => $price,
            'image' => $image
        ]);
        
        $productId = (int)$db->lastInsertId();
        
        // Fetch new product
        $stmt = $db->prepare("SELECT id, product_name as productName, unit, hsn_code as hsnCode, gst, price, image, createdAt, updatedAt 
                              FROM products WHERE id = :id");
        $stmt->execute(['id' => $productId]);
        $prod = $stmt->fetch();
        
        $prod['id'] = (int)$prod['id'];
        $prod['gst'] = (float)$prod['gst'];
        $prod['price'] = (float)$prod['price'];
        $prod['stocks'] = [];
        $prod['shopProducts'] = [];
        
        sendResponse(true, 'Product created successfully', $prod, 201);
    } catch (PDOException $e) {
        sendResponse(false, 'Database error: ' . $e->getMessage(), null, 500);
    }
}

/**
 * Handle PUT /api/products/:id
 */
function updateProduct($productId) {
    $body = getJsonInput();
    
    $db = getDatabaseConnection();
    try {
        // Check if product exists
        $stmt = $db->prepare("SELECT id FROM products WHERE id = :id LIMIT 1");
        $stmt->execute(['id' => $productId]);
        if (!$stmt->fetch()) {
            sendResponse(false, 'Product not found', null, 404);
        }
        
        $updates = [];
        $params = ['id' => $productId];
        
        $fields = [
            'productName' => 'product_name',
            'unit' => 'unit',
            'hsnCode' => 'hsn_code',
            'gst' => 'gst',
            'price' => 'price',
            'image' => 'image'
        ];
        
        foreach ($fields as $bodyKey => $dbCol) {
            if (array_key_exists($bodyKey, $body)) {
                $updates[] = "{$dbCol} = :{$bodyKey}";
                $params[$bodyKey] = $body[$bodyKey];
            }
        }
        
        if (empty($updates)) {
            sendResponse(false, 'No fields to update', null, 400);
        }
        
        $updates[] = "updatedAt = NOW()";
        $updatesStr = implode(', ', $updates);
        
        $stmt = $db->prepare("UPDATE products SET {$updatesStr} WHERE id = :id");
        $stmt->execute($params);
        
        // Fetch updated product
        $stmt = $db->prepare("SELECT id, product_name as productName, unit, hsn_code as hsnCode, gst, price, image, createdAt, updatedAt 
                              FROM products WHERE id = :id");
        $stmt->execute(['id' => $productId]);
        $prod = $stmt->fetch();
        
        $prod['id'] = (int)$prod['id'];
        $prod['gst'] = (float)$prod['gst'];
        $prod['price'] = (float)$prod['price'];
        
        // Fetch stocks
        $stmt = $db->prepare("SELECT id, product_id as productId, quantity, rate FROM stocks WHERE product_id = :product_id");
        $stmt->execute(['product_id' => $productId]);
        $prod['stocks'] = $stmt->fetchAll();
        foreach ($prod['stocks'] as &$st) {
            $st['id'] = (int)$st['id'];
            $st['productId'] = (int)$st['productId'];
            $st['quantity'] = (float)$st['quantity'];
            $st['rate'] = (float)$st['rate'];
        }
        
        // Fetch shop products
        $stmt = $db->prepare("SELECT id, shop_id as shopId, product_id as productId, price FROM shop_products WHERE product_id = :product_id");
        $stmt->execute(['product_id' => $productId]);
        $prod['shopProducts'] = $stmt->fetchAll();
        foreach ($prod['shopProducts'] as &$sp) {
            $sp['id'] = (int)$sp['id'];
            $sp['shopId'] = (int)$sp['shopId'];
            $sp['productId'] = (int)$sp['productId'];
            $sp['price'] = (float)$sp['price'];
        }
        
        sendResponse(true, 'Product updated successfully', $prod);
    } catch (PDOException $e) {
        sendResponse(false, 'Database error: ' . $e->getMessage(), null, 500);
    }
}

/**
 * Handle DELETE /api/products/:id
 */
function deleteProduct($productId) {
    $db = getDatabaseConnection();
    try {
        // Check if product exists
        $stmt = $db->prepare("SELECT id FROM products WHERE id = :id LIMIT 1");
        $stmt->execute(['id' => $productId]);
        if (!$stmt->fetch()) {
            sendResponse(false, 'Product not found', null, 404);
        }
        
        // Check if has bill items
        $stmt = $db->prepare("SELECT COUNT(*) FROM bill_items WHERE product_id = :product_id");
        $stmt->execute(['product_id' => $productId]);
        $billItemCount = (int)$stmt->fetchColumn();
        
        if ($billItemCount > 0) {
            sendResponse(false, 'Cannot delete product with existing bill items. Deactivate instead.', null, 409);
        }
        
        $stmt = $db->prepare("DELETE FROM products WHERE id = :id");
        $stmt->execute(['id' => $productId]);
        
        sendResponse(true, 'Product deleted successfully');
    } catch (PDOException $e) {
        sendResponse(false, 'Database error: ' . $e->getMessage(), null, 500);
    }
}

/**
 * Handle POST /api/products/shop-pricing
 */
function createShopProductPricing() {
    $body = getJsonInput();
    $shopId = isset($body['shopId']) ? (int)$body['shopId'] : 0;
    $productId = isset($body['productId']) ? (int)$body['productId'] : 0;
    $price = isset($body['price']) ? (float)$body['price'] : 0.0;
    
    if ($shopId <= 0 || $productId <= 0 || $price < 0) {
        sendResponse(false, 'Shop ID, Product ID and a valid Price are required', null, 400);
    }
    
    $db = getDatabaseConnection();
    try {
        // Check if already exists
        $stmt = $db->prepare("SELECT id FROM shop_products WHERE shop_id = :shop_id AND product_id = :product_id LIMIT 1");
        $stmt->execute(['shop_id' => $shopId, 'product_id' => $productId]);
        if ($stmt->fetch()) {
            sendResponse(false, 'Product pricing already exists for this shop', null, 409);
        }
        
        $stmt = $db->prepare("INSERT INTO shop_products (shop_id, product_id, price, createdAt, updatedAt) 
                              VALUES (:shop_id, :product_id, :price, NOW(), NOW())");
        $stmt->execute([
            'shop_id' => $shopId,
            'product_id' => $productId,
            'price' => $price
        ]);
        
        $pricingId = (int)$db->lastInsertId();
        
        // Fetch new pricing record
        $stmt = $db->prepare("SELECT sp.id, sp.shop_id as shopId, sp.product_id as productId, sp.price, sp.createdAt, sp.updatedAt,
                                     s.shop_name as shopName,
                                     p.product_name as productName
                              FROM shop_products sp
                              JOIN shops s ON sp.shop_id = s.id
                              JOIN products p ON sp.product_id = p.id
                              WHERE sp.id = :id");
        $stmt->execute(['id' => $pricingId]);
        $sp = $stmt->fetch();
        
        $formatted = [
            'id' => (int)$sp['id'],
            'shopId' => (int)$sp['shopId'],
            'productId' => (int)$sp['productId'],
            'price' => (float)$sp['price'],
            'createdAt' => $sp['createdAt'],
            'updatedAt' => $sp['updatedAt'],
            'shop' => [
                'id' => (int)$sp['shopId'],
                'shopName' => $sp['shopName']
            ],
            'product' => [
                'id' => (int)$sp['productId'],
                'productName' => $sp['productName']
            ]
        ];
        
        sendResponse(true, 'Shop product pricing created successfully', $formatted, 201);
    } catch (PDOException $e) {
        sendResponse(false, 'Database error: ' . $e->getMessage(), null, 500);
    }
}

/**
 * Handle PUT /api/products/shop-pricing/:id
 */
function updateShopProductPricing($pricingId) {
    $body = getJsonInput();
    if (!isset($body['price'])) {
        sendResponse(false, 'Price is required', null, 400);
    }
    $price = (float)$body['price'];
    
    $db = getDatabaseConnection();
    try {
        // Check if exists
        $stmt = $db->prepare("SELECT id FROM shop_products WHERE id = :id LIMIT 1");
        $stmt->execute(['id' => $pricingId]);
        if (!$stmt->fetch()) {
            sendResponse(false, 'Shop product pricing not found', null, 404);
        }
        
        $stmt = $db->prepare("UPDATE shop_products SET price = :price, updatedAt = NOW() WHERE id = :id");
        $stmt->execute(['price' => $price, 'id' => $pricingId]);
        
        // Fetch updated pricing
        $stmt = $db->prepare("SELECT sp.id, sp.shop_id as shopId, sp.product_id as productId, sp.price, sp.createdAt, sp.updatedAt,
                                     s.shop_name as shopName,
                                     p.product_name as productName
                              FROM shop_products sp
                              JOIN shops s ON sp.shop_id = s.id
                              JOIN products p ON sp.product_id = p.id
                              WHERE sp.id = :id");
        $stmt->execute(['id' => $pricingId]);
        $sp = $stmt->fetch();
        
        $formatted = [
            'id' => (int)$sp['id'],
            'shopId' => (int)$sp['shopId'],
            'productId' => (int)$sp['productId'],
            'price' => (float)$sp['price'],
            'createdAt' => $sp['createdAt'],
            'updatedAt' => $sp['updatedAt'],
            'shop' => [
                'id' => (int)$sp['shopId'],
                'shopName' => $sp['shopName']
            ],
            'product' => [
                'id' => (int)$sp['productId'],
                'productName' => $sp['productName']
            ]
        ];
        
        sendResponse(true, 'Shop product pricing updated successfully', $formatted);
    } catch (PDOException $e) {
        sendResponse(false, 'Database error: ' . $e->getMessage(), null, 500);
    }
}

/**
 * Handle DELETE /api/products/shop-pricing/:id
 */
function deleteShopProductPricing($pricingId) {
    $db = getDatabaseConnection();
    try {
        // Check if exists
        $stmt = $db->prepare("SELECT id FROM shop_products WHERE id = :id LIMIT 1");
        $stmt->execute(['id' => $pricingId]);
        if (!$stmt->fetch()) {
            sendResponse(false, 'Shop product pricing not found', null, 404);
        }
        
        $stmt = $db->prepare("DELETE FROM shop_products WHERE id = :id");
        $stmt->execute(['id' => $pricingId]);
        
        sendResponse(true, 'Shop product pricing deleted successfully');
    } catch (PDOException $e) {
        sendResponse(false, 'Database error: ' . $e->getMessage(), null, 500);
    }
}
