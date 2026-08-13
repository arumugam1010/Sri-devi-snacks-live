<?php
require_once __DIR__ . '/../godaddy_upload/api/db.php';

try {
    $db = getDatabaseConnection();
    
    // Check if table exists and show count
    $stmt = $db->query("SELECT COUNT(*) FROM daily_stock_history");
    $count = $stmt->fetchColumn();
    echo "Total records in daily_stock_history: " . $count . "\n\n";
    
    // Fetch first 20 records
    $stmt = $db->query("SELECT h.*, p.product_name 
                        FROM daily_stock_history h
                        JOIN products p ON h.product_id = p.id
                        LIMIT 20");
    $rows = $stmt->fetchAll();
    
    foreach ($rows as $row) {
        echo "ID: {$row['id']} | Date: {$row['date']} | Product: {$row['product_name']} | Stock: {$row['morning_stock']}\n";
    }
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
