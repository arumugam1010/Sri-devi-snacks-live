<?php
/**
 * Schedules Controller
 */

function handleSchedulesRoute($parts, $method) {
    getAuthenticatedUser();
    
    $action = $parts[1] ?? '';
    
    // GET /schedules/day/:dayOfWeek
    if ($action === 'day') {
        $dayOfWeek = $parts[2] ?? '';
        if (!empty($dayOfWeek) && $method === 'GET') {
            getSchedulesByDay($dayOfWeek);
            return;
        }
    }
    
    // GET /schedules/shop/:shopId
    if ($action === 'shop') {
        $shopId = $parts[2] ?? '';
        if (is_numeric($shopId) && $method === 'GET') {
            getSchedulesByShopId((int)$shopId);
            return;
        }
    }
    
    // POST /schedules/bulk-assign
    if ($action === 'bulk-assign') {
        if ($method === 'POST') {
            bulkAssignSchedules();
        } else {
            sendResponse(false, 'Method not allowed', null, 405);
        }
        return;
    }
    
    // POST /schedules/bulk-remove
    if ($action === 'bulk-remove') {
        if ($method === 'POST') {
            bulkRemoveSchedules();
        } else {
            sendResponse(false, 'Method not allowed', null, 405);
        }
        return;
    }
    
    // GET /schedules or POST /schedules
    if (empty($action)) {
        if ($method === 'GET') {
            getWeeklySchedule();
        } elseif ($method === 'POST') {
            createSchedule();
        } else {
            sendResponse(false, 'Method not allowed', null, 405);
        }
        return;
    }
    
    // Detail routes
    if (is_numeric($action)) {
        $scheduleId = (int)$action;
        $subAction = $parts[2] ?? '';
        
        if (empty($subAction)) {
            if ($method === 'DELETE') {
                deleteSchedule($scheduleId);
            } else {
                sendResponse(false, 'Method not allowed', null, 405);
            }
        } elseif ($subAction === 'status' && $method === 'PATCH') {
            updateScheduleStatus($scheduleId);
        } else {
            sendResponse(false, 'Action not found', null, 404);
        }
        return;
    }
    
    sendResponse(false, 'Action not found in schedules', null, 404);
}

/**
 * Helper to fetch shop details
 */
function getShopDetails($db, $shopId) {
    $stmt = $db->prepare("SELECT id, shop_name as shopName, address, contact, email, gst_number as gstNumber, status, createdAt, updatedAt FROM shops WHERE id = :id");
    $stmt->execute(['id' => $shopId]);
    $row = $stmt->fetch();
    if ($row) {
        $row['id'] = (int)$row['id'];
    }
    return $row;
}

/**
 * Handle GET /api/schedules
 */
function getWeeklySchedule() {
    $db = getDatabaseConnection();
    try {
        $stmt = $db->query("SELECT sc.id, sc.shop_id as shopId, sc.day_of_week as dayOfWeek, sc.isActive, sc.createdAt, sc.updatedAt,
                                   sh.shop_name as shopName, sh.address, sh.contact, sh.email, sh.gst_number as gstNumber, sh.status
                            FROM schedules sc
                            JOIN shops sh ON sc.shop_id = sh.id
                            WHERE sc.isActive = 1
                            ORDER BY 
                                CASE sc.day_of_week 
                                    WHEN 'MONDAY' THEN 1
                                    WHEN 'TUESDAY' THEN 2
                                    WHEN 'WEDNESDAY' THEN 3
                                    WHEN 'THURSDAY' THEN 4
                                    WHEN 'FRIDAY' THEN 5
                                    WHEN 'SATURDAY' THEN 6
                                    WHEN 'SUNDAY' THEN 7
                                END ASC,
                                sh.shop_name ASC");
        $rows = $stmt->fetchAll();
        
        $weeklySchedule = [
            'MONDAY' => [],
            'TUESDAY' => [],
            'WEDNESDAY' => [],
            'THURSDAY' => [],
            'FRIDAY' => [],
            'SATURDAY' => [],
            'SUNDAY' => []
        ];
        
        foreach ($rows as $row) {
            $day = strtoupper($row['dayOfWeek']);
            if (array_key_exists($day, $weeklySchedule)) {
                $weeklySchedule[$day][] = [
                    'id' => (int)$row['id'],
                    'isActive' => (bool)$row['isActive'],
                    'createdAt' => $row['createdAt'],
                    'updatedAt' => $row['updatedAt'],
                    'shop' => [
                        'id' => (int)$row['shopId'],
                        'shopName' => $row['shopName'],
                        'address' => $row['address'],
                        'contact' => $row['contact'],
                        'email' => $row['email'],
                        'gstNumber' => $row['gstNumber'],
                        'status' => $row['status']
                    ]
                ];
            }
        }
        
        sendResponse(true, '', $weeklySchedule);
    } catch (PDOException $e) {
        sendResponse(false, 'Database error: ' . $e->getMessage(), null, 500);
    }
}

/**
 * Handle GET /api/schedules/day/:dayOfWeek
 */
function getSchedulesByDay($dayOfWeek) {
    $dayOfWeek = strtoupper($dayOfWeek);
    $validDays = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
    if (!in_array($dayOfWeek, $validDays)) {
        sendResponse(false, 'Invalid day of week', null, 400);
    }
    
    $db = getDatabaseConnection();
    try {
        $stmt = $db->prepare("SELECT sc.id, sc.shop_id as shopId, sc.day_of_week as dayOfWeek, sc.isActive, sc.createdAt, sc.updatedAt,
                                     sh.shop_name as shopName, sh.address, sh.contact, sh.email, sh.gst_number as gstNumber, sh.status
                              FROM schedules sc
                              JOIN shops sh ON sc.shop_id = sh.id
                              WHERE sc.day_of_week = :day AND sc.isActive = 1
                              ORDER BY sh.shop_name ASC");
        $stmt->execute(['day' => $dayOfWeek]);
        $rows = $stmt->fetchAll();
        
        $schedules = [];
        foreach ($rows as $row) {
            $schedules[] = [
                'id' => (int)$row['id'],
                'shopId' => (int)$row['shopId'],
                'dayOfWeek' => $row['dayOfWeek'],
                'isActive' => (bool)$row['isActive'],
                'createdAt' => $row['createdAt'],
                'updatedAt' => $row['updatedAt'],
                'shop' => [
                    'id' => (int)$row['shopId'],
                    'shopName' => $row['shopName'],
                    'address' => $row['address'],
                    'contact' => $row['contact'],
                    'email' => $row['email'],
                    'gstNumber' => $row['gstNumber'],
                    'status' => $row['status']
                ]
            ];
        }
        
        sendResponse(true, '', $schedules);
    } catch (PDOException $e) {
        sendResponse(false, 'Database error: ' . $e->getMessage(), null, 500);
    }
}

/**
 * Handle GET /api/schedules/shop/:shopId
 */
function getSchedulesByShopId($shopId) {
    $db = getDatabaseConnection();
    try {
        $stmt = $db->prepare("SELECT sc.id, sc.shop_id as shopId, sc.day_of_week as dayOfWeek, sc.isActive, sc.createdAt, sc.updatedAt,
                                     sh.shop_name as shopName, sh.address, sh.contact, sh.email, sh.gst_number as gstNumber, sh.status
                              FROM schedules sc
                              JOIN shops sh ON sc.shop_id = sh.id
                              WHERE sc.shop_id = :shop_id AND sc.isActive = 1
                              ORDER BY 
                                CASE sc.day_of_week 
                                    WHEN 'MONDAY' THEN 1
                                    WHEN 'TUESDAY' THEN 2
                                    WHEN 'WEDNESDAY' THEN 3
                                    WHEN 'THURSDAY' THEN 4
                                    WHEN 'FRIDAY' THEN 5
                                    WHEN 'SATURDAY' THEN 6
                                    WHEN 'SUNDAY' THEN 7
                                END ASC");
        $stmt->execute(['shop_id' => $shopId]);
        $rows = $stmt->fetchAll();
        
        $schedules = [];
        foreach ($rows as $row) {
            $schedules[] = [
                'id' => (int)$row['id'],
                'shopId' => (int)$row['shopId'],
                'dayOfWeek' => $row['dayOfWeek'],
                'isActive' => (bool)$row['isActive'],
                'createdAt' => $row['createdAt'],
                'updatedAt' => $row['updatedAt'],
                'shop' => [
                    'id' => (int)$row['shopId'],
                    'shopName' => $row['shopName'],
                    'address' => $row['address'],
                    'contact' => $row['contact'],
                    'email' => $row['email'],
                    'gstNumber' => $row['gstNumber'],
                    'status' => $row['status']
                ]
            ];
        }
        
        sendResponse(true, '', $schedules);
    } catch (PDOException $e) {
        sendResponse(false, 'Database error: ' . $e->getMessage(), null, 500);
    }
}

/**
 * Handle POST /api/schedules
 */
function createSchedule() {
    $body = getJsonInput();
    $shopId = isset($body['shopId']) ? (int)$body['shopId'] : 0;
    $dayOfWeek = isset($body['dayOfWeek']) ? strtoupper($body['dayOfWeek']) : '';
    
    if ($shopId <= 0 || empty($dayOfWeek)) {
        sendResponse(false, 'Shop ID and Day of Week are required', null, 400);
    }
    
    $validDays = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
    if (!in_array($dayOfWeek, $validDays)) {
        sendResponse(false, 'Invalid day of week', null, 400);
    }
    
    $db = getDatabaseConnection();
    try {
        // Verify shop exists
        $shop = getShopDetails($db, $shopId);
        if (!$shop) {
            sendResponse(false, 'Shop not found', null, 404);
        }
        
        // Check unique constraint shopId & dayOfWeek
        $stmt = $db->prepare("SELECT id, isActive FROM schedules WHERE shop_id = :shop_id AND day_of_week = :day LIMIT 1");
        $stmt->execute(['shop_id' => $shopId, 'day' => $dayOfWeek]);
        $existing = $stmt->fetch();
        
        if ($existing) {
            // If it exists but is inactive, reactivate it instead of throwing an error
            if ($existing['isActive'] == 0 || $existing['isActive'] === false) {
                $stmt = $db->prepare("UPDATE schedules SET isActive = 1, updatedAt = NOW() WHERE id = :id");
                $stmt->execute(['id' => $existing['id']]);
                $scheduleId = $existing['id'];
            } else {
                // If we get here and it's active but doesn't show in frontend, it's likely a corrupted MySQL ENUM row matching our query. 
                // Let's force delete it and recreate it just to be safe.
                $stmt = $db->prepare("DELETE FROM schedules WHERE id = :id");
                $stmt->execute(['id' => $existing['id']]);
                
                $stmt = $db->prepare("INSERT INTO schedules (shop_id, day_of_week, isActive, createdAt, updatedAt) 
                                      VALUES (:shop_id, :day, 1, NOW(), NOW())");
                $stmt->execute(['shop_id' => $shopId, 'day' => $dayOfWeek]);
                $scheduleId = (int)$db->lastInsertId();
            }
        } else {
            $stmt = $db->prepare("INSERT INTO schedules (shop_id, day_of_week, isActive, createdAt, updatedAt) 
                                  VALUES (:shop_id, :day, 1, NOW(), NOW())");
            $stmt->execute(['shop_id' => $shopId, 'day' => $dayOfWeek]);
            
            $scheduleId = (int)$db->lastInsertId();
        }
        
        // Fetch new schedule
        $stmt = $db->prepare("SELECT id, shop_id as shopId, day_of_week as dayOfWeek, isActive, createdAt, updatedAt FROM schedules WHERE id = :id");
        $stmt->execute(['id' => $scheduleId]);
        $row = $stmt->fetch();
        
        $row['id'] = (int)$row['id'];
        $row['shopId'] = (int)$row['shopId'];
        $row['isActive'] = (bool)$row['isActive'];
        $row['shop'] = $shop;
        
        sendResponse(true, 'Schedule created successfully', $row, 201);
    } catch (PDOException $e) {
        sendResponse(false, 'Database error: ' . $e->getMessage(), null, 500);
    }
}

/**
 * Handle PATCH /api/schedules/:id/status
 */
function updateScheduleStatus($scheduleId) {
    $body = getJsonInput();
    if (!isset($body['isActive']) || !is_bool($body['isActive'])) {
        sendResponse(false, 'isActive must be a boolean', null, 400);
    }
    
    $isActive = $body['isActive'] ? 1 : 0;
    
    $db = getDatabaseConnection();
    try {
        // Check if exists
        $stmt = $db->prepare("SELECT shop_id FROM schedules WHERE id = :id LIMIT 1");
        $stmt->execute(['id' => $scheduleId]);
        $row = $stmt->fetch();
        if (!$row) {
            sendResponse(false, 'Schedule not found', null, 404);
        }
        
        $stmt = $db->prepare("UPDATE schedules SET isActive = :isActive, updatedAt = NOW() WHERE id = :id");
        $stmt->execute(['isActive' => $isActive, 'id' => $scheduleId]);
        
        // Fetch updated
        $stmt = $db->prepare("SELECT id, shop_id as shopId, day_of_week as dayOfWeek, isActive, createdAt, updatedAt FROM schedules WHERE id = :id");
        $stmt->execute(['id' => $scheduleId]);
        $updated = $stmt->fetch();
        
        $updated['id'] = (int)$updated['id'];
        $updated['shopId'] = (int)$updated['shopId'];
        $updated['isActive'] = (bool)$updated['isActive'];
        $updated['shop'] = getShopDetails($db, $updated['shopId']);
        
        $msg = $body['isActive'] ? 'activated' : 'deactivated';
        sendResponse(true, "Schedule {$msg} successfully", $updated);
    } catch (PDOException $e) {
        sendResponse(false, 'Database error: ' . $e->getMessage(), null, 500);
    }
}

/**
 * Handle DELETE /api/schedules/:id
 */
function deleteSchedule($scheduleId) {
    $db = getDatabaseConnection();
    try {
        // Check if exists
        $stmt = $db->prepare("SELECT id FROM schedules WHERE id = :id LIMIT 1");
        $stmt->execute(['id' => $scheduleId]);
        if (!$stmt->fetch()) {
            sendResponse(false, 'Schedule not found', null, 404);
        }
        
        $stmt = $db->prepare("DELETE FROM schedules WHERE id = :id");
        $stmt->execute(['id' => $scheduleId]);
        
        sendResponse(true, 'Schedule deleted successfully');
    } catch (PDOException $e) {
        sendResponse(false, 'Database error: ' . $e->getMessage(), null, 500);
    }
}

/**
 * Handle POST /api/schedules/bulk-assign
 */
function bulkAssignSchedules() {
    $body = getJsonInput();
    $shopId = isset($body['shopId']) ? (int)$body['shopId'] : 0;
    $daysOfWeek = $body['daysOfWeek'] ?? [];
    
    if ($shopId <= 0 || !is_array($daysOfWeek) || empty($daysOfWeek)) {
        sendResponse(false, 'shopId and daysOfWeek array are required', null, 400);
    }
    
    $validDays = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
    $invalidDays = [];
    foreach ($daysOfWeek as $day) {
        if (!in_array(strtoupper($day), $validDays)) {
            $invalidDays[] = $day;
        }
    }
    
    if (!empty($invalidDays)) {
        sendResponse(false, 'Invalid days: ' . implode(', ', $invalidDays), null, 400);
    }
    
    $db = getDatabaseConnection();
    try {
        $shop = getShopDetails($db, $shopId);
        if (!$shop) {
            sendResponse(false, 'Shop not found', null, 404);
        }
        
        $db->beginTransaction();
        
        $createdSchedules = [];
        $stmt = $db->prepare("INSERT INTO schedules (shop_id, day_of_week, isActive, createdAt, updatedAt) 
                              VALUES (:shop_id, :day, 1, NOW(), NOW())");
                              
        foreach ($daysOfWeek as $day) {
            $day = strtoupper($day);
            // Check if exists
            $check = $db->prepare("SELECT id FROM schedules WHERE shop_id = :shop_id AND day_of_week = :day LIMIT 1");
            $check->execute(['shop_id' => $shopId, 'day' => $day]);
            if ($check->fetch()) {
                continue; // skip duplicate
            }
            
            $stmt->execute(['shop_id' => $shopId, 'day' => $day]);
            $insertedId = (int)$db->lastInsertId();
            
            $createdSchedules[] = [
                'id' => $insertedId,
                'shopId' => $shopId,
                'dayOfWeek' => $day,
                'isActive' => true,
                'createdAt' => date('Y-m-d H:i:s'),
                'updatedAt' => date('Y-m-d H:i:s'),
                'shop' => $shop
            ];
        }
        
        $db->commit();
        sendResponse(true, "Assigned shop to " . count($createdSchedules) . " days", $createdSchedules, 201);
    } catch (PDOException $e) {
        $db->rollBack();
        sendResponse(false, 'Database error: ' . $e->getMessage(), null, 500);
    }
}

/**
 * Handle POST /api/schedules/bulk-remove
 */
function bulkRemoveSchedules() {
    $body = getJsonInput();
    $shopId = isset($body['shopId']) ? (int)$body['shopId'] : 0;
    $daysOfWeek = $body['daysOfWeek'] ?? [];
    
    if ($shopId <= 0 || !is_array($daysOfWeek) || empty($daysOfWeek)) {
        sendResponse(false, 'shopId and daysOfWeek array are required', null, 400);
    }
    
    $daysOfWeekMapped = array_map(function($day) { return "'" . strtoupper($day) . "'"; }, $daysOfWeek);
    $daysStr = implode(',', $daysOfWeekMapped);
    
    $db = getDatabaseConnection();
    try {
        $stmt = $db->prepare("DELETE FROM schedules WHERE shop_id = :shop_id AND day_of_week IN ({$daysStr})");
        $stmt->execute(['shop_id' => $shopId]);
        $count = $stmt->rowCount();
        
        sendResponse(true, "Removed shop from {$count} days", ['removedCount' => $count]);
    } catch (PDOException $e) {
        sendResponse(false, 'Database error: ' . $e->getMessage(), null, 500);
    }
}
