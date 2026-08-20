<?php
date_default_timezone_set('Asia/Kolkata');

try {
    $dsn = "mysql:host=localhost;port=3306;dbname=Sridevi_billing;charset=utf8mb4";
    $pdo = new PDO($dsn, 'root', '', [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_TIMEOUT => 2
    ]);
    echo "CONNECTED TO Sridevi_billing!\n\n";
    
    // Set time zone
    $pdo->exec("SET time_zone = '+05:30'");
    
    $startOfDay = date('Y-m-d 00:00:00');
    $endOfDay = date('Y-m-d 23:59:59');
    
    echo "Time range (Asia/Kolkata): $startOfDay to $endOfDay\n\n";
    
    // 1. Fetch bills from today
    $stmt = $pdo->prepare("SELECT id, bill_number, shop_id, user_id, bill_date, total_amount, received_amount, pending_amount, status, payment_mode, createdAt FROM bills WHERE bill_date >= :start AND bill_date <= :end");
    $stmt->execute(['start' => $startOfDay, 'end' => $endOfDay]);
    $bills = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo "=== TODAY'S BILLS (" . count($bills) . ") ===\n";
    foreach ($bills as $bill) {
        printf("ID: %d | No: %s | Total: %s | Received: %s | Pending: %s | Mode: %s | Date: %s | Created: %s\n",
            $bill['id'],
            $bill['bill_number'],
            $bill['total_amount'],
            $bill['received_amount'],
            $bill['pending_amount'],
            $bill['payment_mode'],
            $bill['bill_date'],
            $bill['createdAt']
        );
    }
    echo "\n";
    
    // 2. Fetch bill_payments from today
    $stmt2 = $pdo->prepare("SELECT id, bill_id, amount, payment_mode, payment_date, created_at FROM bill_payments WHERE payment_date >= :start AND payment_date <= :end");
    $stmt2->execute(['start' => $startOfDay, 'end' => $endOfDay]);
    $payments = $stmt2->fetchAll(PDO::FETCH_ASSOC);
    
    echo "=== TODAY'S PAYMENTS (" . count($payments) . ") ===\n";
    foreach ($payments as $payment) {
        printf("ID: %d | Bill ID: %d | Amount: %s | Mode: %s | Date: %s | Created: %s\n",
            $payment['id'],
            $payment['bill_id'],
            $payment['amount'],
            $payment['payment_mode'],
            $payment['payment_date'],
            $payment['created_at']
        );
    }
    echo "\n";
    
    // 3. Fetch all bill_payments in general to see if dates are mismatched
    $stmt3 = $pdo->query("SELECT id, bill_id, amount, payment_mode, payment_date, created_at FROM bill_payments ORDER BY id DESC LIMIT 5");
    $allPayments = $stmt3->fetchAll(PDO::FETCH_ASSOC);
    echo "=== RECENT PAYMENTS IN SYSTEM ===\n";
    foreach ($allPayments as $payment) {
        printf("ID: %d | Bill ID: %d | Amount: %s | Mode: %s | Date: %s | Created: %s\n",
            $payment['id'],
            $payment['bill_id'],
            $payment['amount'],
            $payment['payment_mode'],
            $payment['payment_date'],
            $payment['created_at']
        );
    }
    
} catch (Exception $e) {
    echo "FAILED: " . $e->getMessage() . "\n";
}
