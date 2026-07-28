<?php
header('Content-Type: application/json');
require_once __DIR__ . '/db.php';

try {
    $db = getDatabaseConnection();
    
    // 1. Find all shops, group by trimmed lowercase shop_name
    $stmt = $db->query("SELECT id, shop_name FROM shops");
    $allShops = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    $grouped = [];
    foreach ($allShops as $shop) {
        $cleanName = strtolower(trim($shop['shop_name']));
        $grouped[$cleanName][] = $shop['id'];
    }
    
    $mergedInfo = [];
    
    // 2. Loop through groups and merge if duplicates exist
    foreach ($grouped as $cleanName => $ids) {
        if (count($ids) > 1) {
            // Sort IDs so the oldest/first created (smallest ID) is the primary one
            sort($ids);
            $primaryId = $ids[0];
            $duplicateIds = array_slice($ids, 1);
            
            $mergedInfo[] = [
                'shop_name' => $cleanName,
                'primary_id' => $primaryId,
                'merged_ids' => $duplicateIds
            ];
            
            foreach ($duplicateIds as $duplicateId) {
                // Update bills
                $stmt = $db->prepare("UPDATE bills SET shop_id = :primary_id WHERE shop_id = :duplicate_id");
                $stmt->execute(['primary_id' => $primaryId, 'duplicate_id' => $duplicateId]);
                
                // Update schedules: we need to handle duplicates.
                // If the primary shop already has a schedule for the same day, delete the duplicate schedule.
                // Otherwise, update the duplicate schedule to point to primary shop.
                $stmt = $db->prepare("SELECT day_of_week FROM schedules WHERE shop_id = :primary_id");
                $stmt->execute(['primary_id' => $primaryId]);
                $primaryDays = $stmt->fetchAll(PDO::FETCH_COLUMN);
                
                $stmt = $db->prepare("SELECT id, day_of_week FROM schedules WHERE shop_id = :duplicate_id");
                $stmt->execute(['duplicate_id' => $duplicateId]);
                $duplicateSchedules = $stmt->fetchAll(PDO::FETCH_ASSOC);
                
                foreach ($duplicateSchedules as $sched) {
                    if (in_array($sched['day_of_week'], $primaryDays)) {
                        // Delete duplicate schedule
                        $delStmt = $db->prepare("DELETE FROM schedules WHERE id = :id");
                        $delStmt->execute(['id' => $sched['id']]);
                    } else {
                        // Move schedule to primary
                        $upStmt = $db->prepare("UPDATE schedules SET shop_id = :primary_id WHERE id = :id");
                        $upStmt->execute(['primary_id' => $primaryId, 'id' => $sched['id']]);
                    }
                }
                
                // Update shop_products (pricing): handle duplicates.
                // If primary shop already has pricing for the same product, delete duplicate pricing.
                // Otherwise update the shop_id.
                $stmt = $db->prepare("SELECT product_id FROM shop_products WHERE shop_id = :primary_id");
                $stmt->execute(['primary_id' => $primaryId]);
                $primaryProducts = $stmt->fetchAll(PDO::FETCH_COLUMN);
                
                $stmt = $db->prepare("SELECT id, product_id FROM shop_products WHERE shop_id = :duplicate_id");
                $stmt->execute(['duplicate_id' => $duplicateId]);
                $duplicateProducts = $stmt->fetchAll(PDO::FETCH_ASSOC);
                
                foreach ($duplicateProducts as $sp) {
                    if (in_array($sp['product_id'], $primaryProducts)) {
                        // Delete duplicate pricing
                        $delStmt = $db->prepare("DELETE FROM shop_products WHERE id = :id");
                        $delStmt->execute(['id' => $sp['id']]);
                    } else {
                        // Move pricing to primary
                        $upStmt = $db->prepare("UPDATE shop_products SET shop_id = :primary_id WHERE id = :id");
                        $upStmt->execute(['primary_id' => $primaryId, 'id' => $sp['id']]);
                    }
                }
                
                // Delete duplicate shop
                $stmt = $db->prepare("DELETE FROM shops WHERE id = :id");
                $stmt->execute(['id' => $duplicateId]);
            }
        }
    }
    
    echo json_encode([
        'success' => true,
        'message' => 'Shop merge completed successfully.',
        'merged_shops' => $mergedInfo
    ]);
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Error: ' . $e->getMessage()
    ]);
}
