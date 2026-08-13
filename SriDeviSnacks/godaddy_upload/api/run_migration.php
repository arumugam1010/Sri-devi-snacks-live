<?php
header("Content-Type: text/plain");
require_once __DIR__ . '/db.php';

try {
    $db = getDatabaseConnection();
    echo "Database connected successfully.\n";
    
    echo "Creating daily_stock_history table...\n";
    $db->exec("CREATE TABLE IF NOT EXISTS daily_stock_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        product_id INT NOT NULL,
        date DATE NOT NULL,
        morning_stock DECIMAL(10, 2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY prod_date_unique (product_id, date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");
    echo "Table created successfully.\n";

    echo "Seeding daily_stock_history table...\n";
    $inserted = $db->exec("
        INSERT IGNORE INTO daily_stock_history (product_id, date, morning_stock)
        SELECT bi.product_id, DATE(b.bill_date) as d, SUM(bi.quantity)
        FROM bill_items bi
        JOIN bills b ON bi.bill_id = b.id
        WHERE bi.quantity > 0
        GROUP BY bi.product_id, d
    ");
    echo "Seeded successfully. Rows affected: " . $inserted . "\n";

    echo "Testing syncTodayMorningStock...\n";
    require_once __DIR__ . '/controllers/stocks.php';
    syncTodayMorningStock($db);
    echo "syncTodayMorningStock ran successfully.\n";

} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
}
