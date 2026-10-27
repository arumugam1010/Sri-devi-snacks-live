<?php
require_once __DIR__ . '/db.php';
$db = getDatabaseConnection();

header('Content-Type: text/html; charset=utf-8');
echo "<h2>Sri Devi Snacks - Fix IGST Bills Tool</h2>";

try {
    // Find all bill items belonging to IGST shops where igst is 0 but product has GST > 0
    $query = "
        SELECT 
            b.id AS bill_id,
            b.bill_number,
            b.shop_id,
            s.shop_name,
            s.gst_type,
            s.gst_number,
            b.total_amount AS old_total_amount,
            b.received_amount,
            b.pending_amount AS old_pending_amount,
            bi.id AS item_id,
            bi.product_id,
            p.product_name,
            bi.quantity,
            bi.rate,
            bi.amount,
            bi.sgst,
            bi.cgst,
            bi.igst,
            p.gst AS product_gst
        FROM bills b
        JOIN shops s ON b.shop_id = s.id
        JOIN bill_items bi ON b.id = bi.bill_id
        JOIN products p ON bi.product_id = p.id
        WHERE s.gst_type = 'IGST' 
          AND (bi.igst = 0 OR bi.igst IS NULL)
          AND p.gst > 0
          AND bi.quantity > 0
        ORDER BY b.id ASC
    ";

    $stmt = $db->query($query);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    if (empty($rows)) {
        echo "<p style='color: green; font-weight: bold;'>No bills found needing IGST correction. All IGST bills are up to date!</p>";
        exit;
    }

    echo "<p>Found <strong>" . count($rows) . "</strong> item(s) in IGST shops requiring IGST calculation.</p>";

    $billsToRecalculate = [];

    // Update each item
    $updateItemStmt = $db->prepare("UPDATE bill_items SET igst = :igst, sgst = 0, cgst = 0 WHERE id = :id");

    foreach ($rows as $row) {
        $itemId = (int)$row['item_id'];
        $amount = (float)$row['amount'];
        $gstPercent = (float)$row['product_gst'];
        $correctIgst = round(($amount * $gstPercent) / 100, 2);

        $updateItemStmt->execute([
            'igst' => $correctIgst,
            'id' => $itemId
        ]);

        $bId = (int)$row['bill_id'];
        $billsToRecalculate[$bId] = [
            'bill_number' => $row['bill_number'],
            'shop_name' => $row['shop_name'],
            'old_total' => (float)$row['old_total_amount'],
            'received' => (float)$row['received_amount']
        ];

        echo "<li>Bill #{$row['bill_number']} ({$row['shop_name']}) - Item: {$row['product_name']} | Qty: {$row['quantity']} | Rate: {$row['rate']} | IGST updated from 0 to <strong>₹{$correctIgst}</strong></li>";
    }

    echo "<hr><h3>Recalculating Bill Totals...</h3><ul>";

    $updateBillStmt = $db->prepare("UPDATE bills SET total_amount = :total, pending_amount = :pending, status = :status WHERE id = :id");

    foreach ($billsToRecalculate as $bId => $info) {
        // Fetch all items for this bill to recalculate total
        $itemsStmt = $db->prepare("SELECT amount, sgst, cgst, igst FROM bill_items WHERE bill_id = :id");
        $itemsStmt->execute(['id' => $bId]);
        $allItems = $itemsStmt->fetchAll(PDO::FETCH_ASSOC);

        $newTotal = 0.00;
        foreach ($allItems as $it) {
            $amt = (float)$it['amount'];
            $sgst = (float)$it['sgst'];
            $cgst = (float)$it['cgst'];
            $igst = (float)$it['igst'];
            $newTotal += $amt + $sgst + $cgst + $igst;
        }

        $newTotal = getRoundingDetailsPhp($newTotal);
        $received = (float)$info['received'];
        $newPending = max(0.00, round($newTotal - $received, 2));
        $newStatus = ($newPending <= 0.00) ? 'COMPLETED' : 'PENDING';

        $updateBillStmt->execute([
            'total' => $newTotal,
            'pending' => $newPending,
            'status' => $newStatus,
            'id' => $bId
        ]);

        echo "<li>Bill #{$info['bill_number']} ({$info['shop_name']}): Old Total = ₹{$info['old_total']} &rarr; <strong style='color: green;'>New Total = ₹{$newTotal}</strong> (Pending: ₹{$newPending})</li>";
    }

    echo "</ul><p style='color: green; font-weight: bold;'>Successfully updated all affected IGST bills!</p>";

} catch (PDOException $e) {
    echo "<p style='color: red;'>Error: " . htmlspecialchars($e->getMessage()) . "</p>";
}
