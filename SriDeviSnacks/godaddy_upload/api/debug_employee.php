<?php
$_ENV['DATABASE_URL'] = 'mysql://root@localhost:3306/Sridevi_billing'; // fallback for CLI

require 'db.php';
$db = getDatabaseConnection();

try {
    $stmt2 = $db->query("SELECT id, name, monthly_salary, salary_type FROM employees WHERE name LIKE '%cake%'");
    $res = $stmt2->fetchAll(PDO::FETCH_ASSOC);
    echo "Before Update:\n";
    print_r($res);
    
    $id = $res[0]['id'];
    
    $stmt = $db->prepare("UPDATE employees SET salary_type = 'daily', monthly_salary = 1000 WHERE id = :id");
    $stmt->execute(['id' => $id]);
    echo "\nRows Updated: " . $stmt->rowCount() . "\n";
    
    $stmt3 = $db->query("SELECT id, name, monthly_salary, salary_type FROM employees WHERE name LIKE '%cake%'");
    $res3 = $stmt3->fetchAll(PDO::FETCH_ASSOC);
    echo "After Update:\n";
    print_r($res3);
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
