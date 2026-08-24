<?php

function handlePurchaseBillsRoute($parts, $method) {
    $db = getDatabaseConnection();
    requireAdminUser();

    $action = $parts[1] ?? '';
    $id = isset($parts[1]) && is_numeric($parts[1]) ? (int)$parts[1] : null;

    if ($method === 'GET') {
        if ($id) {
            // Get single bill and its items
            $stmt = $db->prepare("SELECT pb.*, s.name as supplier_name FROM purchase_bills pb JOIN suppliers s ON pb.supplier_id = s.id WHERE pb.id = ?");
            $stmt->execute([$id]);
            $bill = $stmt->fetch();
            
            if (!$bill) {
                sendResponse(false, 'Purchase bill not found', null, 404);
            }
            
            $stmtItems = $db->prepare("SELECT * FROM purchase_bill_items WHERE bill_id = ?");
            $stmtItems->execute([$id]);
            $bill['items'] = $stmtItems->fetchAll();
            
            sendResponse(true, 'Purchase bill retrieved', $bill);
        } else {
            // Get all bills, optionally filtered by month/year
            $month = $_GET['month'] ?? null; // e.g., '2026-08'
            
            $query = "SELECT pb.*, s.name as supplier_name FROM purchase_bills pb JOIN suppliers s ON pb.supplier_id = s.id";
            $params = [];
            
            if ($month) {
                $query .= " WHERE DATE_FORMAT(pb.bill_date, '%Y-%m') = ?";
                $params[] = $month;
            }
            
            $query .= " ORDER BY pb.bill_date DESC, pb.created_at DESC";
            
            $stmt = $db->prepare($query);
            $stmt->execute($params);
            $bills = $stmt->fetchAll();
            
            sendResponse(true, 'Purchase bills retrieved', $bills);
        }
    } elseif ($method === 'POST') {
        // Handle multipart/form-data for file upload
        // In PHP, $_POST contains form fields, and $_FILES contains uploaded files
        
        $supplierId = isset($_POST['supplier_id']) ? (int)$_POST['supplier_id'] : 0;
        $billNumber = trim($_POST['bill_number'] ?? '');
        $billDate = trim($_POST['bill_date'] ?? date('Y-m-d'));
        $totalAmount = isset($_POST['total_amount']) ? (float)$_POST['total_amount'] : 0;
        $itemsJson = $_POST['items'] ?? '[]';
        $items = json_decode($itemsJson, true);
        
        if (!$supplierId || empty($billNumber)) {
            sendResponse(false, 'Supplier ID and Bill Number are required', null, 400);
        }
        
        $imagePath = null;
        
        // Handle file upload
        if (isset($_FILES['bill_image']) && $_FILES['bill_image']['error'] === UPLOAD_ERR_OK) {
            $uploadDir = __DIR__ . '/../uploads/purchase_bills/';
            if (!is_dir($uploadDir)) {
                mkdir($uploadDir, 0777, true);
            }
            
            $fileExtension = pathinfo($_FILES['bill_image']['name'], PATHINFO_EXTENSION);
            $newFileName = 'bill_' . time() . '_' . uniqid() . '.' . $fileExtension;
            $destination = $uploadDir . $newFileName;
            
            if (move_uploaded_file($_FILES['bill_image']['tmp_name'], $destination)) {
                $imagePath = 'uploads/purchase_bills/' . $newFileName;
            } else {
                sendResponse(false, 'Failed to save uploaded image', null, 500);
            }
        }
        
        try {
            $db->beginTransaction();
            
            $stmt = $db->prepare("INSERT INTO purchase_bills (supplier_id, bill_number, total_amount, image_path, bill_date) VALUES (?, ?, ?, ?, ?)");
            $stmt->execute([$supplierId, $billNumber, $totalAmount, $imagePath, $billDate]);
            $billId = $db->lastInsertId();
            
            if (is_array($items) && count($items) > 0) {
                $itemStmt = $db->prepare("INSERT INTO purchase_bill_items (bill_id, item_name, quantity, price, gst_percentage, total) VALUES (?, ?, ?, ?, ?, ?)");
                foreach ($items as $item) {
                    $itemStmt->execute([
                        $billId,
                        $item['item_name'],
                        (float)$item['quantity'],
                        (float)$item['price'],
                        (float)$item['gst_percentage'],
                        (float)$item['total']
                    ]);
                }
            }
            
            $db->commit();
            sendResponse(true, 'Purchase bill created successfully', ['id' => $billId, 'image_path' => $imagePath]);
        } catch (Exception $e) {
            $db->rollBack();
            // Delete uploaded file if DB insertion failed
            if ($imagePath && file_exists(__DIR__ . '/../' . $imagePath)) {
                unlink(__DIR__ . '/../' . $imagePath);
            }
            sendResponse(false, 'Failed to create purchase bill: ' . $e->getMessage(), null, 500);
        }
    } else {
        sendResponse(false, 'Method Not Allowed', null, 405);
    }
}
