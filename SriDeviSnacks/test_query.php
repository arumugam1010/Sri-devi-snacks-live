<?php
require 'd:\Sri-devi-snacks-live\SriDeviSnacks\php-backend\config.php';
$db = getDatabaseConnection();
$startOfDay = date('Y-m-d 00:00:00');
$endOfDay = date('Y-m-d 23:59:59');

$stmt = $db->prepare("
    SELECT p.id, p.bill_id, p.amount as paidAmount, p.payment_mode as paymentType, p.payment_date,
           s.shop_name as shopName, b.bill_number as billNumber, b.pending_amount as remainingPending, b.bill_date,
           u.name as collectedBy
    FROM bill_payments p
    JOIN bills b ON p.bill_id = b.id
    JOIN shops s ON b.shop_id = s.id
    LEFT JOIN users u ON p.user_id = u.id
    WHERE p.payment_date >= :start AND p.payment_date <= :end
    ORDER BY p.id DESC
");
$stmt->execute(['start' => $startOfDay, 'end' => $endOfDay]);
$todayPaymentsList = $stmt->fetchAll(PDO::FETCH_ASSOC);

foreach ($todayPaymentsList as &$payment) {
    $stmtBill = $db->prepare("SELECT total_amount FROM bills WHERE id = :id");
    $stmtBill->execute(['id' => $payment['bill_id']]);
    $billTotal = (float)($stmtBill->fetchColumn() ?: 0.0);
    
    $isPaymentBill = ($billTotal == 0);
    
    $billDateStr = substr($payment['bill_date'], 0, 10);
    $todayStr = date('Y-m-d');
    $isOldBill = ($billDateStr < $todayStr);

    echo "Bill ID: {$payment['bill_id']}, Bill Date: {$payment['bill_date']}, Is Old: " . ($isOldBill ? 'Yes' : 'No') . ", Type: {$payment['paymentType']}, Paid: {$payment['paidAmount']}\n";
}
