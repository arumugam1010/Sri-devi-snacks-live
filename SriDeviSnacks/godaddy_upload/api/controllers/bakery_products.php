<?php
/**
 * Bakery Products Controller
 */

function handleBakeryProductsRoute($parts, $method) {
    getAuthenticatedUser(); // Ensure user is authenticated

    $action = $parts[1] ?? '';

    // GET /bakery-products or POST /bakery-products
    if (empty($action)) {
        if ($method === 'GET') {
            getBakeryProductsList();
        } elseif ($method === 'POST') {
            createBakeryProduct();
        } else {
            sendResponse(false, 'Method not allowed', null, 405);
        }
        return;
    }

    // Product details by numeric ID
    if (is_numeric($action)) {
        $productId = (int)$action;
        if ($method === 'PUT') {
            updateBakeryProduct($productId);
        } elseif ($method === 'DELETE') {
            deleteBakeryProduct($productId);
        } else {
            sendResponse(false, 'Method not allowed', null, 405);
        }
        return;
    }

    sendResponse(false, 'Action not found in bakery products', null, 404);
}

function getBakeryProductsList() {
    $db = getDatabaseConnection();
    try {
        $stmt = $db->prepare("SELECT id, name, price, image, created_at as createdAt, updated_at as updatedAt FROM bakery_products ORDER BY id DESC");
        $stmt->execute();
        $products = $stmt->fetchAll();
        
        // Convert types
        foreach ($products as &$p) {
            $p['id'] = (int)$p['id'];
            $p['price'] = (float)$p['price'];
        }

        sendResponse(true, 'Bakery products fetched successfully', $products);
    } catch (\PDOException $e) {
        sendResponse(false, 'Database error: ' . $e->getMessage(), null, 500);
    }
}

function createBakeryProduct() {
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (empty($data['name']) || !isset($data['price'])) {
        sendResponse(false, 'Product name and price are required', null, 400);
        return;
    }

    $name = trim($data['name']);
    $price = (float)$data['price'];
    $image = $data['image'] ?? null;

    $db = getDatabaseConnection();
    try {
        $stmt = $db->prepare("INSERT INTO bakery_products (name, price, image) VALUES (:name, :price, :image)");
        $stmt->execute([
            ':name' => $name,
            ':price' => $price,
            ':image' => $image
        ]);
        
        $id = $db->lastInsertId();
        
        $fetchStmt = $db->prepare("SELECT id, name, price, image, created_at as createdAt, updated_at as updatedAt FROM bakery_products WHERE id = :id");
        $fetchStmt->execute([':id' => $id]);
        $product = $fetchStmt->fetch();
        
        $product['id'] = (int)$product['id'];
        $product['price'] = (float)$product['price'];

        sendResponse(true, 'Bakery product created successfully', $product, 201);
    } catch (\PDOException $e) {
        sendResponse(false, 'Database error: ' . $e->getMessage(), null, 500);
    }
}

function updateBakeryProduct($id) {
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (empty($data['name']) || !isset($data['price'])) {
        sendResponse(false, 'Product name and price are required', null, 400);
        return;
    }

    $name = trim($data['name']);
    $price = (float)$data['price'];
    $image = $data['image'] ?? null;

    $db = getDatabaseConnection();
    try {
        $stmt = $db->prepare("UPDATE bakery_products SET name = :name, price = :price, image = :image WHERE id = :id");
        $stmt->execute([
            ':name' => $name,
            ':price' => $price,
            ':image' => $image,
            ':id' => $id
        ]);
        
        if ($stmt->rowCount() === 0) {
            // Check if product exists
            $check = $db->prepare("SELECT id FROM bakery_products WHERE id = :id");
            $check->execute([':id' => $id]);
            if (!$check->fetch()) {
                sendResponse(false, 'Product not found', null, 404);
                return;
            }
        }
        
        $fetchStmt = $db->prepare("SELECT id, name, price, image, created_at as createdAt, updated_at as updatedAt FROM bakery_products WHERE id = :id");
        $fetchStmt->execute([':id' => $id]);
        $product = $fetchStmt->fetch();
        
        $product['id'] = (int)$product['id'];
        $product['price'] = (float)$product['price'];

        sendResponse(true, 'Bakery product updated successfully', $product);
    } catch (\PDOException $e) {
        sendResponse(false, 'Database error: ' . $e->getMessage(), null, 500);
    }
}

function deleteBakeryProduct($id) {
    $db = getDatabaseConnection();
    try {
        $stmt = $db->prepare("DELETE FROM bakery_products WHERE id = :id");
        $stmt->execute([':id' => $id]);
        
        if ($stmt->rowCount() === 0) {
            sendResponse(false, 'Product not found', null, 404);
            return;
        }

        sendResponse(true, 'Bakery product deleted successfully');
    } catch (\PDOException $e) {
        // If there are bills referencing this product, deletion might fail (though we could set ON DELETE CASCADE/RESTRICT)
        // By default, it's restrict/no action.
        sendResponse(false, 'Cannot delete product, it might be used in bills. Error: ' . $e->getMessage(), null, 500);
    }
}
