<?php
/**
 * Dashboard Controller
 */

function handleDashboardRoute($parts, $method) {
    getAuthenticatedUser();
    
    $action = $parts[1] ?? '';
    
    switch ($action) {
        case 'stats':
            if ($method !== 'GET') sendResponse(false, 'Method not allowed', null, 405);
            getDashboardStats();
            break;
            
        case 'recent-bills':
            if ($method !== 'GET') sendResponse(false, 'Method not allowed', null, 405);
            getRecentBills();
            break;
            
        case 'top-shops':
            if ($method !== 'GET') sendResponse(false, 'Method not allowed', null, 405);
            getTopShops();
            break;
            
        case 'top-products':
            if ($method !== 'GET') sendResponse(false, 'Method not allowed', null, 405);
            getTopProducts();
            break;
            
        case 'sales-trend':
            if ($method !== 'GET') sendResponse(false, 'Method not allowed', null, 405);
            getSalesTrend();
            break;
            
        case 'low-stock':
            if ($method !== 'GET') sendResponse(false, 'Method not allowed', null, 405);
            getLowStockDashboard();
            break;
            
        default:
            sendResponse(false, 'Action not found in dashboard', null, 404);
    }
}

/**
 * Handle GET /api/dashboard/stats
 */
function getDashboardStats() {
    $db = getDatabaseConnection();
    try {
        $startOfDay = date('Y-m-d 00:00:00');
        $endOfDay = date('Y-m-d 23:59:59');
        $startOfYesterday = date('Y-m-d 00:00:00', strtotime('-1 day'));
        $endOfYesterday = date('Y-m-d 23:59:59', strtotime('-1 day'));
        
        // 1. Total & Active Shops
        $totalShops = (int)$db->query("SELECT COUNT(*) FROM shops")->fetchColumn();
        $activeShops = (int)$db->query("SELECT COUNT(*) FROM shops WHERE status = 'ACTIVE'")->fetchColumn();
        
        // 2. Total Products (Active/Inactive mapped to same count in node backend)
        $totalProducts = (int)$db->query("SELECT COUNT(*) FROM products")->fetchColumn();
        
        // 3. Today's Bills Count
        $stmt = $db->prepare("SELECT COUNT(*) FROM bills WHERE bill_date >= :start AND bill_date <= :end");
        $stmt->execute(['start' => $startOfDay, 'end' => $endOfDay]);
        $todaysBills = (int)$stmt->fetchColumn();
        
        // 4. Yesterday's Bills Count
        $stmt = $db->prepare("SELECT COUNT(*) FROM bills WHERE bill_date >= :start AND bill_date <= :end");
        $stmt->execute(['start' => $startOfYesterday, 'end' => $endOfYesterday]);
        $yesterdaysBills = (int)$stmt->fetchColumn();
        
        // 5. Today's Revenue
        $stmt = $db->prepare("SELECT SUM(total_amount) FROM bills WHERE bill_date >= :start AND bill_date <= :end");
        $stmt->execute(['start' => $startOfDay, 'end' => $endOfDay]);
        $todaysRevenue = (float)$stmt->fetchColumn();
        
        // 6. Yesterday's Revenue
        $stmt = $db->prepare("SELECT SUM(total_amount) FROM bills WHERE bill_date >= :start AND bill_date <= :end");
        $stmt->execute(['start' => $startOfYesterday, 'end' => $endOfYesterday]);
        $yesterdaysRevenue = (float)$stmt->fetchColumn();
        
        // 7. Pending Bills Count
        $pendingBills = (int)$db->query("SELECT COUNT(*) FROM bills WHERE status = 'PENDING'")->fetchColumn();
        
        // 8. Total Revenue
        $totalRevenue = (float)$db->query("SELECT SUM(total_amount) FROM bills")->fetchColumn();
        
        // 9. Low Stock Count
        $lowStockItems = (int)$db->query("SELECT COUNT(*) FROM stocks WHERE quantity <= 10")->fetchColumn();
        
        // 10. Total Stock items
        $totalStock = (float)$db->query("SELECT SUM(quantity) FROM stocks")->fetchColumn();
        
        // 11. Today's collections from bill_payments
        $stmt = $db->prepare("
            SELECT p.id, p.bill_id, p.amount as paidAmount, p.payment_mode as paymentType, p.payment_date,
                   s.shop_name as shopName, b.bill_number as billNumber, b.pending_amount as remainingPending, b.bill_date, b.total_amount as billTotalAmount,
                   u.name as collectedBy
            FROM bill_payments p
            JOIN bills b ON p.bill_id = b.id
            JOIN shops s ON b.shop_id = s.id
            LEFT JOIN users u ON p.user_id = u.id
            WHERE p.payment_date >= :start AND p.payment_date <= :end
            ORDER BY p.id DESC
        ");
        $stmt->execute(['start' => $startOfDay, 'end' => $endOfDay]);
        $todayPaymentsList = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        $totalCollectedToday = 0.0;
        foreach ($todayPaymentsList as &$payment) {
            $payment['id'] = (int)$payment['id'];
            $payment['bill_id'] = (int)$payment['bill_id'];
            $payment['paidAmount'] = (float)$payment['paidAmount'];
            
            $billTotal = (float)$payment['billTotalAmount'];
            
            $isPaymentBill = ($billTotal == 0);
            
            // Extract Y-m-d from bill_date
            $billDateParts = explode(' ', $payment['bill_date']);
            $billDateStr = $billDateParts[0];
            $todayStr = date('Y-m-d');
            $isOldBill = (strtotime($billDateStr) < strtotime($todayStr));

            if ($payment['paymentType'] === 'GPAY') {
                $payment['paymentType'] = 'GPAY';
            } else {
                $payment['paymentType'] = ($isPaymentBill || $isOldBill) ? 'Pending Collection' : 'Bill Payment';
            }
            
            if ($isPaymentBill) {
                $payment['remainingPending'] = '-';
            } else {
                $payment['remainingPending'] = '₹' . number_format((float)$payment['remainingPending'], 2);
            }
            
            $totalCollectedToday += $payment['paidAmount'];
        }

        // Percentage Changes
        $billsChange = $yesterdaysBills > 0 
          ? (($todaysBills - $yesterdaysBills) / $yesterdaysBills * 100) 
          : 0;
          
        $revenueChange = $yesterdaysRevenue > 0 
          ? (($todaysRevenue - $yesterdaysRevenue) / $yesterdaysRevenue * 100)
          : 0;
          
        $stats = [
            'shops' => [
                'total' => $totalShops,
                'active' => $activeShops,
                'inactive' => $totalShops - $activeShops
            ],
            'products' => [
                'total' => $totalProducts,
                'active' => $totalProducts,
                'inactive' => 0
            ],
            'bills' => [
                'today' => $todaysBills,
                'yesterday' => $yesterdaysBills,
                'pending' => $pendingBills,
                'change' => round($billsChange, 1)
            ],
            'revenue' => [
                'today' => $todaysRevenue,
                'yesterday' => $yesterdaysRevenue,
                'total' => $totalRevenue,
                'change' => round($revenueChange, 1)
            ],
            'stock' => [
                'lowStockItems' => $lowStockItems,
                'totalItems' => $totalStock
            ],
            'collections' => [
                'today_total' => $totalCollectedToday,
                'today_list' => $todayPaymentsList,
                'today_fuel_expense' => (float)$db->query("SELECT COALESCE(SUM(amount), 0) FROM fuel_expenses WHERE expense_date = '" . date('Y-m-d') . "' AND type != 'MAKROON'")->fetchColumn(),
                'today_makroon_expense' => (float)$db->query("SELECT COALESCE(SUM(amount), 0) FROM fuel_expenses WHERE expense_date = '" . date('Y-m-d') . "' AND type = 'MAKROON'")->fetchColumn()
            ]
        ];
        
        sendResponse(true, '', $stats);
    } catch (PDOException $e) {
        sendResponse(false, 'Database error: ' . $e->getMessage(), null, 500);
    }
}

/**
 * Handle GET /api/dashboard/recent-bills
 */
function getRecentBills() {
    $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 5;
    $limit = min(max($limit, 1), 20);
    
    $db = getDatabaseConnection();
    try {
        $stmt = $db->prepare("SELECT b.id, b.bill_number as billNumber, b.shop_id as shopId, b.user_id as userId, b.bill_date as billDate,
                                     b.total_amount as totalAmount, b.received_amount as receivedAmount, b.pending_amount as pendingAmount, b.status, b.notes, b.signature, b.createdAt, b.updatedAt,
                                     s.shop_name as shopName,
                                     u.name as userName
                              FROM bills b
                              JOIN shops s ON b.shop_id = s.id
                              JOIN users u ON b.user_id = u.id
                              ORDER BY b.createdAt DESC 
                              LIMIT :limit");
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->execute();
        $rows = $stmt->fetchAll();
        
        $recentBills = [];
        if (!empty($rows)) {
            $billIds = array_column($rows, 'id');
            $billIdsStr = implode(',', $billIds);
            
            // Count items per bill
            $countsStmt = $db->query("SELECT bill_id, COUNT(*) as itemsCount FROM bill_items WHERE bill_id IN ({$billIdsStr}) GROUP BY bill_id");
            $itemCounts = [];
            while ($cRow = $countsStmt->fetch()) {
                $itemCounts[(int)$cRow['bill_id']] = (int)$cRow['itemsCount'];
            }
            
            foreach ($rows as $row) {
                $billIdKey = (int)$row['id'];
                $recentBills[] = [
                    'id' => $billIdKey,
                    'billNumber' => $row['billNumber'],
                    'shopId' => (int)$row['shopId'],
                    'userId' => (int)$row['userId'],
                    'billDate' => $row['billDate'],
                    'totalAmount' => (float)$row['totalAmount'],
                    'receivedAmount' => (float)$row['receivedAmount'],
                    'pendingAmount' => (float)$row['pendingAmount'],
                    'status' => $row['status'],
                    'notes' => $row['notes'],
                    'signature' => $row['signature'],
                    'createdAt' => $row['createdAt'],
                    'updatedAt' => $row['updatedAt'],
                    'shop' => [
                        'id' => (int)$row['shopId'],
                        'shopName' => $row['shopName']
                    ],
                    'user' => [
                        'id' => (int)$row['userId'],
                        'name' => $row['userName']
                    ],
                    '_count' => [
                        'billItems' => $itemCounts[$billIdKey] ?? 0
                    ]
                ];
            }
        }
        
        sendResponse(true, '', $recentBills);
    } catch (PDOException $e) {
        sendResponse(false, 'Database error: ' . $e->getMessage(), null, 500);
    }
}

/**
 * Handle GET /api/dashboard/top-shops
 */
function getTopShops() {
    $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 5;
    $limit = min(max($limit, 1), 10);
    $period = isset($_GET['period']) ? (int)$_GET['period'] : 30;
    
    $startDate = date('Y-m-d 00:00:00', strtotime("-{$period} days"));
    
    $db = getDatabaseConnection();
    try {
        // Query to get shops with bills count and sum total_amount
        $stmt = $db->prepare("SELECT s.id, s.shop_name as shopName, s.address, s.contact,
                                     COUNT(b.id) as billsCount,
                                     COALESCE(SUM(b.total_amount), 0) as totalRevenue
                              FROM shops s
                              LEFT JOIN bills b ON s.id = b.shop_id AND b.bill_date >= :start AND b.status != 'CANCELLED'
                              GROUP BY s.id
                              ORDER BY totalRevenue DESC
                              LIMIT :limit");
        $stmt->bindValue(':start', $startDate);
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->execute();
        $rows = $stmt->fetchAll();
        
        $topShops = [];
        foreach ($rows as $row) {
            $topShops[] = [
                'id' => (int)$row['id'],
                'shopName' => $row['shopName'],
                'address' => $row['address'],
                'contact' => $row['contact'],
                'billsCount' => (int)$row['billsCount'],
                'totalRevenue' => (float)$row['totalRevenue']
            ];
        }
        
        sendResponse(true, '', $topShops);
    } catch (PDOException $e) {
        sendResponse(false, 'Database error: ' . $e->getMessage(), null, 500);
    }
}

/**
 * Handle GET /api/dashboard/top-products
 */
function getTopProducts() {
    $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 5;
    $limit = min(max($limit, 1), 10);
    $period = isset($_GET['period']) ? (int)$_GET['period'] : 30;
    
    $startDate = date('Y-m-d 00:00:00', strtotime("-{$period} days"));
    
    $db = getDatabaseConnection();
    try {
        $stmt = $db->prepare("SELECT p.id, p.product_name as productName, p.unit, p.hsn_code as hsnCode,
                                     COALESCE(SUM(bi.quantity), 0) as quantitySold,
                                     COALESCE(SUM(bi.amount), 0) as totalRevenue,
                                     COUNT(bi.id) as salesCount
                              FROM products p
                              LEFT JOIN bill_items bi ON p.id = bi.product_id
                              LEFT JOIN bills b ON bi.bill_id = b.id AND b.bill_date >= :start AND b.status != 'CANCELLED'
                              GROUP BY p.id
                              ORDER BY quantitySold DESC
                              LIMIT :limit");
        $stmt->bindValue(':start', $startDate);
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->execute();
        $rows = $stmt->fetchAll();
        
        $topProducts = [];
        foreach ($rows as $row) {
            $topProducts[] = [
                'id' => (int)$row['id'],
                'productName' => $row['productName'],
                'unit' => $row['unit'],
                'hsnCode' => $row['hsnCode'],
                'quantitySold' => (float)$row['quantitySold'],
                'totalRevenue' => (float)$row['totalRevenue'],
                'salesCount' => (int)$row['salesCount']
            ];
        }
        
        sendResponse(true, '', $topProducts);
    } catch (PDOException $e) {
        sendResponse(false, 'Database error: ' . $e->getMessage(), null, 500);
    }
}

/**
 * Handle GET /api/dashboard/sales-trend
 */
function getSalesTrend() {
    $days = isset($_GET['days']) ? (int)$_GET['days'] : 30;
    $days = min(max($days, 1), 90);
    
    $startDate = date('Y-m-d 00:00:00', strtotime("-{$days} days"));
    
    $db = getDatabaseConnection();
    try {
        $stmt = $db->prepare("SELECT DATE(bill_date) as dateStr, SUM(total_amount) as revenue, COUNT(id) as billsCount
                              FROM bills 
                              WHERE bill_date >= :start AND status != 'CANCELLED'
                              GROUP BY DATE(bill_date)
                              ORDER BY dateStr ASC");
        $stmt->execute(['start' => $startDate]);
        $rows = $stmt->fetchAll();
        
        // Format trend with 0s for missing days
        $trend = [];
        $current = strtotime($startDate);
        $end = time();
        
        while ($current <= $end) {
            $dateStr = date('Y-m-d', $current);
            
            // Find in queried data
            $found = null;
            foreach ($rows as $row) {
                if ($row['dateStr'] === $dateStr) {
                    $found = $row;
                    break;
                }
            }
            
            $trend[] = [
                'date' => $dateStr,
                'revenue' => $found ? (float)$found['revenue'] : 0.0,
                'billsCount' => $found ? (int)$found['billsCount'] : 0
            ];
            
            $current = strtotime("+1 day", $current);
        }
        
        sendResponse(true, '', $trend);
    } catch (PDOException $e) {
        sendResponse(false, 'Database error: ' . $e->getMessage(), null, 500);
    }
}

/**
 * Handle GET /api/dashboard/low-stock
 */
function getLowStockDashboard() {
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
        
        $lowStock = [];
        foreach ($rows as $row) {
            $lowStock[] = [
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
        
        sendResponse(true, '', $lowStock);
    } catch (PDOException $e) {
        sendResponse(false, 'Database error: ' . $e->getMessage(), null, 500);
    }
}
