<?php
header('Content-Type: application/json');
require_once __DIR__ . '/db.php';
try {
    $db = getDatabaseConnection();
    $stmt = $db->query("SHOW COLUMNS FROM bills");
    $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode([
        'success' => true,
        'message' => 'Connected successfully',
        'columns' => $columns
    ]);
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
