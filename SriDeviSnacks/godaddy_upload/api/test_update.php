<?php
require 'db.php';
$db = getDatabaseConnection();
$id = 1; // Try updating Ramesh or cake Ramesh

try {
    $db->beginTransaction();
    $stmt = $db->prepare("UPDATE employees SET salary_type = 'daily', monthly_salary = 1000 WHERE name LIKE '%cake%'");
    $stmt->execute();
    $rowCount = $stmt->rowCount();
    $db->commit();
    
    $stmt2 = $db->query("SELECT name, monthly_salary, salary_type FROM employees WHERE name LIKE '%cake%'");
    $res = $stmt2->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode(['updated' => $rowCount, 'data' => $res]);
} catch (Exception $e) {
    echo json_encode(['error' => $e->getMessage()]);
}
