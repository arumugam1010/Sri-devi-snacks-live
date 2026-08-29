<?php
/**
 * Bakery Bills Controller
 */

function handleBakeryBillsRoute($parts, $method) {
    getAuthenticatedUser(); // Ensure user is authenticated

    $action = $parts[1] ?? '';

    if (empty($action)) {
        if ($method === 'GET') {
            getBakeryBillsList();
        } elseif ($method === 'POST') {
            createBakeryBill();
        } else {
            sendResponse(false, 'Method not allowed', null, 405);
        }
        return;
    }

    if (is_numeric($action)) {
        $billId = (int)$action;
        if ($method === 'GET') {
            getBakeryBillById($billId);
        } else {
            sendResponse(false, 'Method not allowed', null, 405);
        }
        return;
    }

    sendResponse(false, 'Action not found in bakery bills', null, 404);
}

function getBakeryBillsList() {
    $db = getDatabaseConnection();
    try {
        $stmt = $db->prepare("SELECT * FROM bakery_bills ORDER BY id DESC");
        $stmt->execute();
        $bills = $stmt->fetchAll();
        
        foreach ($bills as &$b) {
            $b['id'] = (int)$b['id'];
            $b['total_amount'] = (float)$b['total_amount'];
            $b['paid_amount'] = (float)$b['paid_amount'];
            $b['pending_amount'] = (float)$b['pending_amount'];
            $b['location_name'] = $b['location_name'] ?? null;
            
            // Get items
            $itemStmt = $db->prepare("SELECT * FROM bakery_bill_items WHERE bill_id = :bill_id");
            $itemStmt->execute([':bill_id' => $b['id']]);
            $items = $itemStmt->fetchAll();
            foreach ($items as &$i) {
                $i['id'] = (int)$i['id'];
                $i['bill_id'] = (int)$i['bill_id'];
                $i['product_id'] = (int)$i['product_id'];
                $i['quantity'] = (int)$i['quantity'];
                $i['price'] = (float)$i['price'];
                $i['total'] = (float)$i['total'];
            }
            $b['items'] = $items;
        }

        sendResponse(true, 'Bakery bills fetched successfully', $bills);
    } catch (\PDOException $e) {
        sendResponse(false, 'Database error: ' . $e->getMessage(), null, 500);
    }
}

function getBakeryBillById($id) {
    $db = getDatabaseConnection();
    try {
        $stmt = $db->prepare("SELECT * FROM bakery_bills WHERE id = :id");
        $stmt->execute([':id' => $id]);
        $bill = $stmt->fetch();
        
        if (!$bill) {
            sendResponse(false, 'Bill not found', null, 404);
            return;
        }
        
        $bill['id'] = (int)$bill['id'];
        $bill['total_amount'] = (float)$bill['total_amount'];
        $bill['paid_amount'] = (float)$bill['paid_amount'];
        $bill['pending_amount'] = (float)$bill['pending_amount'];
        $bill['location_name'] = $bill['location_name'] ?? null;
        
        $itemStmt = $db->prepare("SELECT * FROM bakery_bill_items WHERE bill_id = :bill_id");
        $itemStmt->execute([':bill_id' => $bill['id']]);
        $items = $itemStmt->fetchAll();
        foreach ($items as &$i) {
            $i['id'] = (int)$i['id'];
            $i['bill_id'] = (int)$i['bill_id'];
            $i['product_id'] = (int)$i['product_id'];
            $i['quantity'] = (int)$i['quantity'];
            $i['price'] = (float)$i['price'];
            $i['total'] = (float)$i['total'];
        }
        $bill['items'] = $items;

        sendResponse(true, 'Bakery bill fetched successfully', $bill);
    } catch (\PDOException $e) {
        sendResponse(false, 'Database error: ' . $e->getMessage(), null, 500);
    }
}

function createBakeryBill() {
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (empty($data['items']) || !is_array($data['items'])) {
        sendResponse(false, 'Bill items are required', null, 400);
        return;
    }

    $totalAmount = (float)($data['total_amount'] ?? 0);
    $paidAmount = (float)($data['paid_amount'] ?? 0);
    $pendingAmount = $totalAmount - $paidAmount;
    $customerName = $data['customer_name'] ?? null;
    $customerPhone = $data['customer_phone'] ?? null;
    $locationName = $data['location_name'] ?? null;

    $db = getDatabaseConnection();
    try {
        $db->beginTransaction();

        $stmt = $db->prepare("INSERT INTO bakery_bills (total_amount, paid_amount, pending_amount, customer_name, customer_phone, location_name) VALUES (:total_amount, :paid_amount, :pending_amount, :customer_name, :customer_phone, :location_name)");
        $stmt->execute([
            ':total_amount' => $totalAmount,
            ':paid_amount' => $paidAmount,
            ':pending_amount' => $pendingAmount,
            ':customer_name' => $customerName,
            ':customer_phone' => $customerPhone,
            ':location_name' => $locationName
        ]);
        
        $billId = $db->lastInsertId();
        
        $itemStmt = $db->prepare("INSERT INTO bakery_bill_items (bill_id, product_id, product_name, quantity, price, total) VALUES (:bill_id, :product_id, :product_name, :quantity, :price, :total)");
        $stockStmt = $db->prepare("UPDATE bakery_products SET stock = GREATEST(0, stock - :quantity) WHERE id = :product_id");
        
        foreach ($data['items'] as $item) {
            $itemStmt->execute([
                ':bill_id' => $billId,
                ':product_id' => $item['product_id'],
                ':product_name' => $item['product_name'],
                ':quantity' => $item['quantity'],
                ':price' => $item['price'],
                ':total' => $item['total']
            ]);
            
            $stockStmt->execute([
                ':quantity' => $item['quantity'],
                ':product_id' => $item['product_id']
            ]);
        }

        $db->commit();

        sendResponse(true, 'Bakery bill created successfully', ['id' => $billId], 201);
    } catch (\PDOException $e) {
        $db->rollBack();
        sendResponse(false, 'Database error: ' . $e->getMessage(), null, 500);
    }
}
