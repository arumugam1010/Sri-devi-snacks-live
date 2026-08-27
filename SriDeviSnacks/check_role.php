<?php
require 'php-backend/db.php';
$pdo = getDatabaseConnection();
$stmt = $pdo->query("SELECT name, role FROM users WHERE username = 'accounts'");
$user = $stmt->fetch();
echo "Name: " . $user['name'] . ", Role: " . $user['role'];
