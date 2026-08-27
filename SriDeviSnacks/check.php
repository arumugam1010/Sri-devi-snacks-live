<?php
require 'php-backend/db.php';
$pdo = getDatabaseConnection();
$stmt = $pdo->query("SHOW CREATE TABLE users");
echo $stmt->fetchColumn(1);
