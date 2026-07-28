<?php
header('Content-Type: application/json');
require_once __DIR__ . '/db.php';

try {
    $db = getDatabaseConnection();
    
    // Check if column 'image' exists in products
    $stmt = $db->query("SHOW COLUMNS FROM products LIKE 'image'");
    $column = $stmt->fetch();
    
    if (!$column) {
        $db->exec("ALTER TABLE products ADD COLUMN image LONGTEXT NULL");
        echo json_encode([
            'success' => true,
            'message' => 'Column "image" added to products table successfully.'
        ]);
    } else {
        echo json_encode([
            'success' => true,
            'message' => 'Column "image" already exists in products table.'
        ]);
    }
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Error: ' . $e->getMessage()
    ]);
}
