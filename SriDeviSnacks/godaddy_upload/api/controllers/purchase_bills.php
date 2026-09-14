    <?php

    function handlePurchaseBillsRoute($parts, $method) {
        $db = getDatabaseConnection();
        requireSuperAdminOrAccounts();

        $action = $parts[1] ?? '';
        $id = isset($parts[1]) && is_numeric($parts[1]) ? (int)$parts[1] : null;

        if ($method === 'GET') {
            if ($id) {
                // Get single bill and its items
                $stmt = $db->prepare("SELECT pb.*, s.name as supplier_name, s.address as supplier_address, s.gst_number as supplier_gst FROM purchase_bills pb JOIN suppliers s ON pb.supplier_id = s.id WHERE pb.id = ?");
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
                
                $query = "SELECT pb.*, s.name as supplier_name, s.address as supplier_address, s.gst_number as supplier_gst FROM purchase_bills pb JOIN suppliers s ON pb.supplier_id = s.id";
                $params = [];
                
                if ($month) {
                    $query .= " WHERE DATE_FORMAT(pb.bill_date, '%Y-%m') = ?";
                    $params[] = $month;
                }
                
                $query .= " ORDER BY pb.bill_date DESC, pb.created_at DESC";
                
                $stmt = $db->prepare($query);
                $stmt->execute($params);
                $bills = $stmt->fetchAll();
                
                // Fetch items for all bills in batch
                if (!empty($bills)) {
                    $billIds = array_column($bills, 'id');
                    $inPlaceholders = implode(',', array_fill(0, count($billIds), '?'));
                    $itemStmt = $db->prepare("SELECT * FROM purchase_bill_items WHERE bill_id IN ($inPlaceholders)");
                    $itemStmt->execute($billIds);
                    $allItems = $itemStmt->fetchAll();
                    
                    $itemsByBillId = [];
                    foreach ($allItems as $item) {
                        $itemsByBillId[$item['bill_id']][] = $item;
                    }
                    
                    foreach ($bills as &$b) {
                        $bItems = $itemsByBillId[$b['id']] ?? [];
                        $b['items'] = $bItems;
                        
                        $taxable = 0;
                        $gstAmt = 0;
                        foreach ($bItems as $it) {
                            $itTaxable = (float)$it['quantity'] * (float)$it['price'];
                            $itGst = $itTaxable * ((float)$it['gst_percentage'] / 100);
                            $taxable += $itTaxable;
                            $gstAmt += $itGst;
                        }
                        
                        if (empty($bItems) || (int)$b['is_gst'] === 0) {
                            $b['taxable_amount'] = (float)$b['total_amount'];
                            $b['gst_amount'] = 0.0;
                        } else {
                            $b['taxable_amount'] = round($taxable, 2);
                            $b['gst_amount'] = round($gstAmt, 2);
                        }
                    }
                    unset($b);
                }
                
                sendResponse(true, 'Purchase bills retrieved', $bills);
            }
        } elseif ($method === 'POST') {
            // Check if this is an image update for an existing bill
            if ($id) {
                if (!isset($_FILES['bill_image']) || $_FILES['bill_image']['error'] !== UPLOAD_ERR_OK) {
                    sendResponse(false, 'No valid image file uploaded', null, 400);
                }

                $uploadDir = __DIR__ . '/../uploads/purchase_bills/';
                if (!is_dir($uploadDir)) {
                    mkdir($uploadDir, 0777, true);
                }

                $fileExtension = pathinfo($_FILES['bill_image']['name'], PATHINFO_EXTENSION);
                $newFileName = 'bill_' . time() . '_' . uniqid() . '.' . $fileExtension;
                $destination = $uploadDir . $newFileName;

                if (!move_uploaded_file($_FILES['bill_image']['tmp_name'], $destination)) {
                    sendResponse(false, 'Failed to save uploaded image', null, 500);
                }

                $imagePath = 'uploads/purchase_bills/' . $newFileName;

                // Delete old image if exists
                $oldStmt = $db->prepare("SELECT image_path FROM purchase_bills WHERE id = ?");
                $oldStmt->execute([$id]);
                $oldBill = $oldStmt->fetch();

                $updateStmt = $db->prepare("UPDATE purchase_bills SET image_path = ? WHERE id = ?");
                $updateStmt->execute([$imagePath, $id]);

                if ($oldBill && !empty($oldBill['image_path']) && file_exists(__DIR__ . '/../' . $oldBill['image_path'])) {
                    @unlink(__DIR__ . '/../' . $oldBill['image_path']);
                }

                sendResponse(true, 'Bill image updated successfully', ['image_path' => $imagePath]);
            }

            // Create new purchase bill
            $supplierId = isset($_POST['supplier_id']) ? (int)$_POST['supplier_id'] : 0;
            $billNumber = trim($_POST['bill_number'] ?? '');
            $billDate = trim($_POST['bill_date'] ?? date('Y-m-d'));
            $totalAmount = isset($_POST['total_amount']) ? (float)$_POST['total_amount'] : 0;
            $isGst = isset($_POST['is_gst']) ? (int)$_POST['is_gst'] : 1;
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
                
                $stmt = $db->prepare("INSERT INTO purchase_bills (supplier_id, bill_number, total_amount, image_path, bill_date, is_gst) VALUES (?, ?, ?, ?, ?, ?)");
                $stmt->execute([$supplierId, $billNumber, $totalAmount, $imagePath, $billDate, $isGst]);
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
        } elseif ($method === 'DELETE') {
            if (!$id) {
                sendResponse(false, 'Bill ID is required', null, 400);
            }
            $stmt = $db->prepare("SELECT image_path FROM purchase_bills WHERE id = ?");
            $stmt->execute([$id]);
            $bill = $stmt->fetch();
            if ($bill) {
                if (!empty($bill['image_path']) && file_exists(__DIR__ . '/../' . $bill['image_path'])) {
                    @unlink(__DIR__ . '/../' . $bill['image_path']);
                }
                $delStmt = $db->prepare("DELETE FROM purchase_bills WHERE id = ?");
                $delStmt->execute([$id]);
                sendResponse(true, 'Purchase bill deleted successfully');
            } else {
                sendResponse(false, 'Purchase bill not found', null, 404);
            }
        } else {
            sendResponse(false, 'Method Not Allowed', null, 405);
        }
    }
