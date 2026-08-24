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
        
        // Set MySQL timezone to Asia/Kolkata (IST)
        $pdo->exec("SET time_zone = '+05:30'");
        
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

                // Check and add column 'payment_mode' to 'bills' table if missing
                $stmt = $pdo->query("SHOW COLUMNS FROM bills LIKE 'payment_mode'");
                $column = $stmt->fetch();
                if (!$column) {
                    $pdo->exec("ALTER TABLE bills ADD COLUMN payment_mode VARCHAR(50) NULL");
                }
                
                // Check and add morning_stock to stocks table
                try {
                    $stmt = $pdo->query("SHOW COLUMNS FROM stocks LIKE 'morning_stock'");
                    $column = $stmt->fetch();
                    if (!$column) {
                        $pdo->exec("ALTER TABLE stocks ADD COLUMN morning_stock DECIMAL(10, 2) NULL");
                        $pdo->exec("ALTER TABLE stocks ADD COLUMN morning_stock_date DATE NULL");
                        // Initialize existing stocks
                        $pdo->exec("UPDATE stocks SET morning_stock = quantity, morning_stock_date = CURDATE()");
                    }
                } catch (\Exception $e) {}
                
                // Check and add gst_number to suppliers table
                try {
                    $stmt = $pdo->query("SHOW COLUMNS FROM suppliers LIKE 'gst_number'");
                    $column = $stmt->fetch();
                    if (!$column) {
                        $pdo->exec("ALTER TABLE suppliers ADD COLUMN gst_number VARCHAR(50) NULL");
                    }
                } catch (\Exception $e) {}
                
                // Check and create settings table
                $pdo->exec("CREATE TABLE IF NOT EXISTS settings (
                    setting_key VARCHAR(100) PRIMARY KEY,
                    setting_value TEXT NULL
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

                // Check and create employees table
                $pdo->exec("CREATE TABLE IF NOT EXISTS employees (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    name VARCHAR(100) NOT NULL,
                    contact VARCHAR(20) NOT NULL,
                    monthly_salary DECIMAL(10, 2) NOT NULL,
                    salary_type VARCHAR(10) NOT NULL DEFAULT 'monthly',
                    joining_date DATE NOT NULL,
                    status VARCHAR(20) NOT NULL DEFAULT 'active',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

                // Check if salary_type column exists, if not add it
                $checkCol = $pdo->query("SHOW COLUMNS FROM employees LIKE 'salary_type'");
                if (!$checkCol->fetch()) {
                    $pdo->exec("ALTER TABLE employees ADD COLUMN salary_type VARCHAR(10) NOT NULL DEFAULT 'monthly'");
                }

                // Check and create employee_attendance table
                $pdo->exec("CREATE TABLE IF NOT EXISTS employee_attendance (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    employee_id INT NOT NULL,
                    date DATE NOT NULL,
                    status VARCHAR(20) NOT NULL DEFAULT 'present',
                    remarks VARCHAR(255) NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE KEY emp_date_unique (employee_id, date)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

                // Check and create employee_salaries table
                $pdo->exec("CREATE TABLE IF NOT EXISTS employee_salaries (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    employee_id INT NOT NULL,
                    month VARCHAR(7) NOT NULL,
                    salary_amount DECIMAL(10, 2) NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE KEY emp_month_unique (employee_id, month)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

                // Check and create employee_payments table
                $pdo->exec("CREATE TABLE IF NOT EXISTS employee_payments (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    employee_id INT NOT NULL,
                    amount DECIMAL(10, 2) NOT NULL,
                    payment_date DATE NOT NULL,
                    month VARCHAR(7) NOT NULL,
                    remarks VARCHAR(255) NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

                // Check and create employee_biometrics table
                $pdo->exec("CREATE TABLE IF NOT EXISTS employee_biometrics (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    employee_id INT NOT NULL,
                    credential_id VARCHAR(255) NOT NULL,
                    public_key TEXT NOT NULL,
                    device_name VARCHAR(100) NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE KEY emp_biometric_unique (employee_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

                // Check and create bill_payments table
                $pdo->exec("CREATE TABLE IF NOT EXISTS bill_payments (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    bill_id INT NOT NULL,
                    amount DECIMAL(10, 2) NOT NULL,
                    payment_mode VARCHAR(50) NULL,
                    payment_date DATETIME NOT NULL,
                    user_id INT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

                // Initialize/Sync bill_payments for existing bills if missing
                try {
                    $pdo->exec("
                        INSERT INTO bill_payments (bill_id, amount, payment_mode, payment_date, user_id, created_at)
                        SELECT b.id, b.received_amount, COALESCE(b.payment_mode, 'CASH'), b.bill_date, b.user_id, b.createdAt
                        FROM bills b
                        LEFT JOIN bill_payments p ON b.id = p.bill_id
                        WHERE b.received_amount > 0 AND p.id IS NULL
                    ");
                } catch (\Exception $e) {
                    // Ignore migration issues
                }

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

                // Clean up corrupted enum values and add SUNDAY to schedules day_of_week enum
                try {
                    // If an invalid ENUM was inserted when strict mode was off, it gets index 0
                    $pdo->exec("DELETE FROM schedules WHERE day_of_week + 0 = 0 OR day_of_week IS NULL");
                    $pdo->exec("ALTER TABLE schedules MODIFY COLUMN day_of_week ENUM('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY') NOT NULL");
                } catch (\Exception $e) {
                    // Ignore if already altered or table doesn't exist
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

                // Create daily_stock_history table
                $pdo->exec("CREATE TABLE IF NOT EXISTS daily_stock_history (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    product_id INT NOT NULL,
                    date DATE NOT NULL,
                    morning_stock DECIMAL(10, 2) NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE KEY prod_date_unique (product_id, date)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

                // Create fuel_expenses table
                $pdo->exec("CREATE TABLE IF NOT EXISTS fuel_expenses (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    amount DECIMAL(10, 2) NOT NULL,
                    type VARCHAR(50) NOT NULL,
                    expense_date DATE NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    INDEX idx_expense_date (expense_date)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

                // Create suppliers table
                $pdo->exec("CREATE TABLE IF NOT EXISTS suppliers (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    name VARCHAR(255) NOT NULL,
                    contact_info VARCHAR(255) NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

                // Create supplier_items table
                $pdo->exec("CREATE TABLE IF NOT EXISTS supplier_items (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    supplier_id INT NOT NULL,
                    item_name VARCHAR(255) NOT NULL,
                    default_price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
                    gst_rate DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

                // Create purchase_bills table
                $pdo->exec("CREATE TABLE IF NOT EXISTS purchase_bills (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    supplier_id INT NOT NULL,
                    bill_number VARCHAR(100) NOT NULL,
                    total_amount DECIMAL(10, 2) NOT NULL,
                    image_path VARCHAR(255) NULL,
                    bill_date DATE NOT NULL,
                    is_gst TINYINT(1) NOT NULL DEFAULT 1,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

                // Check and add is_gst to purchase_bills if missing
                try {
                    $stmt = $pdo->query("SHOW COLUMNS FROM purchase_bills LIKE 'is_gst'");
                    if (!$stmt->fetch()) {
                        $pdo->exec("ALTER TABLE purchase_bills ADD COLUMN is_gst TINYINT(1) NOT NULL DEFAULT 1");
                    }
                } catch (\Exception $e) {}

                // Create purchase_bill_items table
                $pdo->exec("CREATE TABLE IF NOT EXISTS purchase_bill_items (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    bill_id INT NOT NULL,
                    item_name VARCHAR(255) NOT NULL,
                    quantity DECIMAL(10, 2) NOT NULL,
                    price DECIMAL(10, 2) NOT NULL,
                    gst_percentage DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
                    total DECIMAL(10, 2) NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (bill_id) REFERENCES purchase_bills(id) ON DELETE CASCADE
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

                // Seed daily_stock_history from bill items
                try {
                    $pdo->exec("
                        INSERT IGNORE INTO daily_stock_history (product_id, `date`, morning_stock)
                        SELECT bi.product_id, DATE(b.bill_date) as d, SUM(bi.quantity)
                        FROM bill_items bi
                        JOIN bills b ON bi.bill_id = b.id
                        WHERE bi.quantity > 0
                        GROUP BY bi.product_id, d
                    ");
                } catch (\Exception $seedErr) {}
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

