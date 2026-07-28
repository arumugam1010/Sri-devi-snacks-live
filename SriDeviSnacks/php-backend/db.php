<?php
/**
 * Database connection setup using PDO and parsing DATABASE_URL
 */

require_once __DIR__ . '/env_loader.php';

function getDatabaseConnection() {
    static $pdo = null;
    if ($pdo !== null) {
        return $pdo;
    }

    $dbUrl = getenv('DATABASE_URL') ?: ($_ENV['DATABASE_URL'] ?? null);
    if (!$dbUrl) {
        header('HTTP/1.1 500 Internal Server Error');
        echo json_encode([
            'success' => false,
            'message' => 'Database configuration error: DATABASE_URL not found.'
        ]);
        exit;
    }

    // Parse mysql://user:pass@host:port/dbname
    $parsed = parse_url($dbUrl);
    if (!$parsed || !isset($parsed['scheme']) || $parsed['scheme'] !== 'mysql') {
        header('HTTP/1.1 500 Internal Server Error');
        echo json_encode([
            'success' => false,
            'message' => 'Database configuration error: Invalid DATABASE_URL format.'
        ]);
        exit;
    }

    $host = $parsed['host'] ?? 'localhost';
    $port = $parsed['port'] ?? 3306;
    $user = $parsed['user'] ?? '';
    $pass = $parsed['pass'] ?? '';
    $dbName = isset($parsed['path']) ? ltrim($parsed['path'], '/') : '';

    $dsn = "mysql:host={$host};port={$port};dbname={$dbName};charset=utf8mb4";
    
    $options = [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ];

    try {
        $pdo = new PDO($dsn, $user, $pass, $options);
        
        // Auto-migrate: check and add column 'image' to 'products' table if missing
        static $migrated = false;
        if (!$migrated) {
            $migrated = true;
            try {
                $stmt = $pdo->query("SHOW COLUMNS FROM products LIKE 'image'");
                $column = $stmt->fetch();
                if (!$column) {
                    $pdo->exec("ALTER TABLE products ADD COLUMN image LONGTEXT NULL");
                }
                
                // Check and create settings table
                $pdo->exec("CREATE TABLE IF NOT EXISTS settings (
                    setting_key VARCHAR(100) PRIMARY KEY,
                    setting_value TEXT NULL
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

                // Ensure settings table actually has a PRIMARY KEY (migration for older tables)
                try {
                    $stmtStr = $pdo->query("SHOW CREATE TABLE settings");
                    $createTableSql = $stmtStr->fetchColumn(1);
                    if ($createTableSql && strpos($createTableSql, 'PRIMARY KEY') === false) {
                        // Clean up duplicate entries by keeping the non-empty / most recent value
                        $dupStmt = $pdo->query("SELECT setting_key, COUNT(*) as count FROM settings GROUP BY setting_key HAVING count > 1");
                        $duplicates = $dupStmt->fetchAll(PDO::FETCH_ASSOC);
                        foreach ($duplicates as $dup) {
                            $key = $dup['setting_key'];
                            $valStmt = $pdo->prepare("SELECT setting_value FROM settings WHERE setting_key = :key ORDER BY (setting_value != '') DESC, setting_value DESC LIMIT 1");
                            $valStmt->execute(['key' => $key]);
                            $keepValue = $valStmt->fetchColumn();
                            
                            $delStmt = $pdo->prepare("DELETE FROM settings WHERE setting_key = :key");
                            $delStmt->execute(['key' => $key]);
                            
                            $insStmt = $pdo->prepare("INSERT INTO settings (setting_key, setting_value) VALUES (:key, :val)");
                            $insStmt->execute(['key' => $key, 'val' => $keepValue]);
                        }
                        // Add primary key constraint now that duplicates are removed
                        $pdo->exec("ALTER TABLE settings ADD PRIMARY KEY (setting_key)");
                    }
                } catch (\Exception $e) {
                    // Ignore migration issues to avoid blocking connection
                }
                
                // Insert default vehicle number if it doesn't exist
                $checkStmt = $pdo->prepare("SELECT COUNT(*) FROM settings WHERE setting_key = 'vehicle_number'");
                $checkStmt->execute();
                if ($checkStmt->fetchColumn() == 0) {
                    $insertStmt = $pdo->prepare("INSERT INTO settings (setting_key, setting_value) VALUES ('vehicle_number', 'TN72DX4338')");
                    $insertStmt->execute();
                }

                // Insert default WhatsApp & Low Stock settings
                $defaultSettings = [
                    'whatsapp_enabled' => 'false',
                    'whatsapp_phone' => '9943206339',
                    'whatsapp_provider' => 'ultramsg',
                    'whatsapp_api_token' => '',
                    'whatsapp_instance_id' => '',
                    'low_stock_threshold' => '20',
                    'sms_enabled' => 'false',
                    'sms_phone' => '9943206339',
                    'sms_api_key' => ''
                ];


                foreach ($defaultSettings as $key => $val) {
                    $checkSetting = $pdo->prepare("SELECT COUNT(*) FROM settings WHERE setting_key = :key");
                    $checkSetting->execute(['key' => $key]);
                    if ($checkSetting->fetchColumn() == 0) {
                        $insertSetting = $pdo->prepare("INSERT INTO settings (setting_key, setting_value) VALUES (:key, :val)");
                        $insertSetting->execute(['key' => $key, 'val' => $val]);
                    }
                }
            } catch (\Exception $migrErr) {
                // Keep execution running even if migration check fails
            }
        }
        
        return $pdo;
    } catch (\PDOException $e) {
        header('HTTP/1.1 500 Internal Server Error');
        echo json_encode([
            'success' => false,
            'message' => 'Database connection failed: ' . $e->getMessage()
        ]);
        exit;
    }
}

