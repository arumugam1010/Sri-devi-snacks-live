<?php
require_once __DIR__ . '/db.php';
header('Content-Type: application/json');

try {
    $db = getDatabaseConnection();
    
    // Get all schedules
    $stmt = $db->query("SELECT id, shop_id, day_of_week, isActive FROM schedules ORDER BY id DESC LIMIT 50");
    $schedules = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode([
        'status' => 'success',
        'message' => 'Recent schedules',
        'data' => $schedules
    ]);
    
} catch (Exception $e) {
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage()
    ]);
}
