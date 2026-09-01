<?php

function handleSuppliersRoute($parts, $method) {
    $db = getDatabaseConnection();
    requireSuperAdminOrAccounts(); // Only Admins and Accounts can manage suppliers

    $action = $parts[1] ?? '';
    $id = isset($parts[1]) && is_numeric($parts[1]) ? (int)$parts[1] : null;

    if ($method === 'GET') {
        if ($id) {
            // Get single supplier and their items
            $stmt = $db->prepare("SELECT * FROM suppliers WHERE id = ?");
            $stmt->execute([$id]);
            $supplier = $stmt->fetch();
            
            if (!$supplier) {
                sendResponse(false, 'Supplier not found', null, 404);
            }
            
            $stmtItems = $db->prepare("SELECT * FROM supplier_items WHERE supplier_id = ?");
            $stmtItems->execute([$id]);
            $supplier['items'] = $stmtItems->fetchAll();
            
            sendResponse(true, 'Supplier retrieved', $supplier);
        } else {
            // Get all suppliers
            $stmt = $db->query("SELECT * FROM suppliers ORDER BY name ASC");
            $suppliers = $stmt->fetchAll();
            
            // Also fetch items for each to make frontend easier
            foreach ($suppliers as &$supplier) {
                $stmtItems = $db->prepare("SELECT * FROM supplier_items WHERE supplier_id = ?");
                $stmtItems->execute([$supplier['id']]);
                $supplier['items'] = $stmtItems->fetchAll();
            }
            
            sendResponse(true, 'Suppliers retrieved', $suppliers);
        }
    } elseif ($method === 'POST') {
        $input = getJsonInput();
        $name = trim($input['name'] ?? '');
        $contact = trim($input['contact_info'] ?? '');
        $gst_number = trim($input['gst_number'] ?? '');
        $address = trim($input['address'] ?? '');
        $items = $input['items'] ?? []; // Array of {item_name, default_price, gst_rate}

        if (empty($name)) {
            sendResponse(false, 'Supplier name is required', null, 400);
        }

        try {
            $db->beginTransaction();

            $stmt = $db->prepare("INSERT INTO suppliers (name, contact_info, gst_number, address) VALUES (?, ?, ?, ?)");
            $stmt->execute([$name, $contact, $gst_number, $address]);
            $supplierId = $db->lastInsertId();

            if (is_array($items) && count($items) > 0) {
                $itemStmt = $db->prepare("INSERT INTO supplier_items (supplier_id, item_name, default_price, gst_rate) VALUES (?, ?, ?, ?)");
                foreach ($items as $item) {
                    $itemStmt->execute([
                        $supplierId, 
                        $item['item_name'], 
                        isset($item['default_price']) ? (float)$item['default_price'] : 0, 
                        isset($item['gst_rate']) ? (float)$item['gst_rate'] : 0
                    ]);
                }
            }

            $db->commit();
            sendResponse(true, 'Supplier created successfully', ['id' => $supplierId]);
        } catch (Exception $e) {
            $db->rollBack();
            sendResponse(false, 'Failed to create supplier: ' . $e->getMessage(), null, 500);
        }
    } elseif ($method === 'PUT' && $id) {
         $input = getJsonInput();
         $name = trim($input['name'] ?? '');
         $contact = trim($input['contact_info'] ?? '');
         $gst_number = trim($input['gst_number'] ?? '');
         $address = trim($input['address'] ?? '');
         $items = $input['items'] ?? []; // Array of {item_name, default_price, gst_rate}
 
         if (empty($name)) {
             sendResponse(false, 'Supplier name is required', null, 400);
         }
 
         try {
             $db->beginTransaction();
 
             $stmt = $db->prepare("UPDATE suppliers SET name = ?, contact_info = ?, gst_number = ?, address = ? WHERE id = ?");
             $stmt->execute([$name, $contact, $gst_number, $address, $id]);
             
             // Simple approach: delete existing items and re-insert
             $delStmt = $db->prepare("DELETE FROM supplier_items WHERE supplier_id = ?");
             $delStmt->execute([$id]);

             if (is_array($items) && count($items) > 0) {
                 $itemStmt = $db->prepare("INSERT INTO supplier_items (supplier_id, item_name, default_price, gst_rate) VALUES (?, ?, ?, ?)");
                 foreach ($items as $item) {
                     $itemStmt->execute([
                         $id, 
                         $item['item_name'], 
                         isset($item['default_price']) ? (float)$item['default_price'] : 0, 
                         isset($item['gst_rate']) ? (float)$item['gst_rate'] : 0
                     ]);
                 }
             }
 
             $db->commit();
             sendResponse(true, 'Supplier updated successfully');
         } catch (Exception $e) {
             $db->rollBack();
             sendResponse(false, 'Failed to update supplier: ' . $e->getMessage(), null, 500);
         }
    } elseif ($method === 'DELETE' && $id) {
        try {
            $stmt = $db->prepare("DELETE FROM suppliers WHERE id = ?");
            $stmt->execute([$id]);
            sendResponse(true, 'Supplier deleted successfully');
        } catch (Exception $e) {
             sendResponse(false, 'Failed to delete supplier (Make sure no purchase bills are attached): ' . $e->getMessage(), null, 500);
        }
    } else {
        sendResponse(false, 'Method Not Allowed', null, 405);
    }
}
