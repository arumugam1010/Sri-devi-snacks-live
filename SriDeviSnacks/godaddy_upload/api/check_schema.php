<?php
require 'db.php';
$db = getDatabaseConnection();
$stmt = $db->query('SHOW COLUMNS FROM employees');
print_r($stmt->fetchAll(PDO::FETCH_ASSOC));
