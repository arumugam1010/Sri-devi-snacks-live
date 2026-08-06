<?php
require_once __DIR__ . '/db.php';
$db = getDatabaseConnection();

try {
    // Get all bills
    $stmt = $db->query("SELECT id, received_amount FROM bills");
    $bills = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $fixedCount = 0;

    foreach ($bills as $bill) {
        $billId = (int)$bill['id'];
        $receivedAmount = (float)$bill['received_amount'];

        // Get total payments for this bill
        $payStmt = $db->prepare("SELECT SUM(amount) FROM bill_payments WHERE bill_id = :bill_id");
        $payStmt->execute(['bill_id' => $billId]);
        $totalPaid = (float)$payStmt->fetchColumn();

        if (round($totalPaid, 2) > round($receivedAmount, 2)) {
            $diff = round($totalPaid - $receivedAmount, 2);
            
            // Delete payments starting from the newest until diff is resolved
            $listStmt = $db->prepare("SELECT id, amount FROM bill_payments WHERE bill_id = :bill_id ORDER BY id DESC");
            $listStmt->execute(['bill_id' => $billId]);
            $payments = $listStmt->fetchAll();

            $remainingToRemove = $diff;
            foreach ($payments as $pay) {
                if ($remainingToRemove <= 0) break;
                
                $payAmount = (float)$pay['amount'];
                $payId = (int)$pay['id'];
                
                if ($payAmount <= $remainingToRemove) {
                    $db->prepare("DELETE FROM bill_payments WHERE id = :id")->execute(['id' => $payId]);
                    $remainingToRemove = round($remainingToRemove - $payAmount, 2);
                } else {
                    $newPayAmount = round($payAmount - $remainingToRemove, 2);
                    $db->prepare("UPDATE bill_payments SET amount = :amt WHERE id = :id")->execute(['amt' => $newPayAmount, 'id' => $payId]);
                    $remainingToRemove = 0;
                }
            }
            $fixedCount++;
        }
    }

    echo "Successfully fixed orphaned payments for $fixedCount bills.";

} catch (PDOException $e) {
    echo "Error: " . $e->getMessage();
}
