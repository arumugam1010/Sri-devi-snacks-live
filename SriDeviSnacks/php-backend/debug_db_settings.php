<?php
header('Content-Type: application/json');
require_once __DIR__ . '/db.php';

try {
    $db = getDatabaseConnection();
    
    // 1. Get Table Structure
    $stmt = $db->query("SHOW CREATE TABLE settings");
    $createTableSql = $stmt->fetchColumn(1);
    
    // 2. Get Rows count and data
    $stmt = $db->query("SELECT setting_key, COUNT(*) as count FROM settings GROUP BY setting_key");
    $duplicates = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    $stmt = $db->query("SELECT * FROM settings");
    $allRows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // 3. Fix potential issues (e.g., if there are duplicate rows or if PRIMARY KEY is missing)
    $fixed = false;
    foreach ($duplicates as $dup) {
        if ($dup['count'] > 1) {
            // We have duplicates! Let's clean them up.
            $key = $dup['setting_key'];
            // Fetch the last updated or non-empty value
            $valStmt = $db->prepare("SELECT setting_value FROM settings WHERE setting_key = :key ORDER BY (setting_value != '') DESC LIMIT 1");
            $valStmt->execute(['key' => $key]);
            $keepValue = $valStmt->fetchColumn();
            
            // Delete all
            $delStmt = $db->prepare("DELETE FROM settings WHERE setting_key = :key");
            $delStmt->execute(['key' => $key]);
            
            // Re-insert single copy
            $insStmt = $db->prepare("INSERT INTO settings (setting_key, setting_value) VALUES (:key, :val)");
            $insStmt->execute(['key' => $key, 'val' => $keepValue]);
            $fixed = true;
        }
    }
    
    // 4. Ensure setting_key is PRIMARY KEY if it's not
    if (strpos($createTableSql, 'PRIMARY KEY') === false) {
        $db->exec("ALTER TABLE settings ADD PRIMARY KEY (setting_key)");
        $fixed = true;
    }
    
    echo json_encode([
        'success' => true,
        'fixed' => $fixed,
        'create_table_sql' => $createTableSql,
        'duplicates' => $duplicates,
        'all_rows' => $allRows
    ], JSON_PRETTY_PRINT);
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ], JSON_PRETTY_PRINT);
}
