<?php
/**
 * Bakery Shops Controller
 */

function handleBakeryShopsRoute($parts, $method) {
    getAuthenticatedUser(); // Ensure user is authenticated

    $action = $parts[1] ?? '';

    if (empty($action)) {
        if ($method === 'GET') {
            getBakeryShops();
        } elseif ($method === 'POST') {
            createBakeryShop();
        } else {
            sendResponse(false, 'Method not allowed', null, 405);
        }
        return;
    }

    if (is_numeric($action)) {
        $id = (int)$action;
        if ($method === 'PUT') {
            updateBakeryShop($id);
        } elseif ($method === 'DELETE') {
            deleteBakeryShop($id);
        } else {
            sendResponse(false, 'Method not allowed', null, 405);
        }
        return;
    }

    sendResponse(false, 'Action not found in bakery shops', null, 404);
}

function getBakeryShops() {
    $db = getDatabaseConnection();
    try {
        $stmt = $db->query("SELECT * FROM bakery_shops ORDER BY name ASC");
        $shops = $stmt->fetchAll(PDO::FETCH_ASSOC);
        sendResponse(true, 'Bakery shops fetched', $shops);
    } catch (\PDOException $e) {
        sendResponse(false, 'Database error: ' . $e->getMessage(), null, 500);
    }
}

function createBakeryShop() {
    $data = getJsonInput();
    if (empty($data['name'])) {
        sendResponse(false, 'Shop name is required', null, 400);
    }

    $db = getDatabaseConnection();
    try {
        $stmt = $db->prepare("INSERT INTO bakery_shops (name, phone, address, latitude, longitude) VALUES (:name, :phone, :address, :latitude, :longitude)");
        $stmt->execute([
            'name' => $data['name'],
            'phone' => $data['phone'] ?? null,
            'address' => $data['address'] ?? null,
            'latitude' => $data['latitude'] ?? null,
            'longitude' => $data['longitude'] ?? null
        ]);
        sendResponse(true, 'Shop added successfully', ['id' => $db->lastInsertId()]);
    } catch (\PDOException $e) {
        sendResponse(false, 'Database error: ' . $e->getMessage(), null, 500);
    }
}

function updateBakeryShop($id) {
    $data = getJsonInput();
    if (empty($data['name'])) {
        sendResponse(false, 'Shop name is required', null, 400);
    }

    $db = getDatabaseConnection();
    try {
        $stmt = $db->prepare("UPDATE bakery_shops SET name = :name, phone = :phone, address = :address, latitude = :latitude, longitude = :longitude WHERE id = :id");
        $stmt->execute([
            'id' => $id,
            'name' => $data['name'],
            'phone' => $data['phone'] ?? null,
            'address' => $data['address'] ?? null,
            'latitude' => $data['latitude'] ?? null,
            'longitude' => $data['longitude'] ?? null
        ]);
        sendResponse(true, 'Shop updated successfully');
    } catch (\PDOException $e) {
        sendResponse(false, 'Database error: ' . $e->getMessage(), null, 500);
    }
}

function deleteBakeryShop($id) {
    $db = getDatabaseConnection();
    try {
        $stmt = $db->prepare("DELETE FROM bakery_shops WHERE id = :id");
        $stmt->execute(['id' => $id]);
        sendResponse(true, 'Shop deleted successfully');
    } catch (\PDOException $e) {
        sendResponse(false, 'Database error: ' . $e->getMessage(), null, 500);
    }
}
