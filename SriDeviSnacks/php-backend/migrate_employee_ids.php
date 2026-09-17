<?php
/**
 * Standalone one-click migration script for Employee IDs
 * Can be accessed directly via browser: https://sridevisnacks.com/api/migrate_employee_ids.php
 */
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/db.php';

try {
    $pdo = getDatabaseConnection();

    // 1. Ensure column exists
    $checkCol = $pdo->query("SHOW COLUMNS FROM employees LIKE 'employee_code'");
    if (!$checkCol->fetch()) {
        $pdo->exec("ALTER TABLE employees ADD COLUMN employee_code VARCHAR(50) NULL AFTER id");
    }

    // 2. Fetch all employees
    $employees = $pdo->query("SELECT id, name, joining_date, employee_code FROM employees ORDER BY id ASC")->fetchAll(PDO::FETCH_ASSOC);

    $currentYear = date('y');
    $currentMonth = date('m');
    $updated = [];

    foreach ($employees as $index => $emp) {
        $seq = $index + 1;
        $newCode = sprintf("SDS-%s-%s-%03d", $currentYear, $currentMonth, $seq);
        
        $upd = $pdo->prepare("UPDATE employees SET employee_code = :code WHERE id = :id");
        $upd->execute(['code' => $newCode, 'id' => $emp['id']]);

        $updated[] = [
            'id' => (int)$emp['id'],
            'name' => $emp['name'],
            'employee_code' => $newCode
        ];
    }

    // 3. Ensure unique index
    try {
        $checkIdx = $pdo->query("SHOW INDEX FROM employees WHERE Key_name = 'unique_employee_code'");
        if (!$checkIdx->fetch()) {
            $pdo->exec("ALTER TABLE employees ADD UNIQUE KEY unique_employee_code (employee_code)");
        }
    } catch (\Exception $e) {}

    echo json_encode([
        'success' => true,
        'message' => 'Successfully assigned Employee IDs to all employees!',
        'total' => count($updated),
        'employees' => $updated
    ], JSON_PRETTY_PRINT);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error: ' . $e->getMessage()
    ], JSON_PRETTY_PRINT);
}
