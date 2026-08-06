<?php
require 'db.php';
$db = getDatabaseConnection();
$stmt = $db->query("SELECT p.id, p.amount, p.payment_mode, p.payment_date, b.bill_date, b.total_amount, s.shop_name FROM bill_payments p JOIN bills b ON p.bill_id = b.id JOIN shops s ON b.shop_id = s.id WHERE DATE(p.payment_date) = CURDATE() AND s.shop_name LIKE '%பவானி%'");
print_r($stmt->fetchAll());
