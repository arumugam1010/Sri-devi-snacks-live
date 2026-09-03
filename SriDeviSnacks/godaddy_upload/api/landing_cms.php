<?php
require_once __DIR__ . '/jwt.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/env_loader.php';

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS, DELETE");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

try {
    $pdo = getDatabaseConnection();
    $action = $_GET['action'] ?? '';

    // === PUBLIC ENDPOINTS ===

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        if ($action === 'get_settings') {
            $stmt = $pdo->query("SELECT setting_key, setting_value FROM landing_settings");
            $settings = [];
            while ($row = $stmt->fetch()) {
                $settings[$row['setting_key']] = $row['setting_value'];
            }
            echo json_encode(['success' => true, 'settings' => $settings]);
            exit;
        }

        if ($action === 'get_products') {
            // Auto-seed if empty
            $stmt = $pdo->query("SELECT COUNT(*) FROM landing_products");
            if ($stmt->fetchColumn() == 0) {
                // Seed default products
                $seedData = [
                    ['Achi Murukku', '/assets/achi_murukku.jpeg', '₹60 / Pack', 'Crispy, sweet, and traditional Achi Murukku.'],
                    ['Andhra Murukku', '/assets/andhra_murukku.jpeg', '₹60 / 200g', 'Spicy and crunchy Andhra style Murukku.'],
                    ['Bombay Mixture', '/assets/bombay_mixture.jpeg', '₹60 / 200g', 'Classic Bombay Mixture loaded with authentic flavors.'],
                    ['Coconut Milk Murukku', '/assets/coconut_milk_murukku.jpeg', '₹50 / 150g', 'Delicate Murukku made with fresh coconut milk.'],
                    ['Garlic Chilli Murukku', '/assets/garlic_chilli_murukku.jpeg', '₹50 / 150g', 'A fiery blend of garlic and chilli.'],
                    ['Garlic Murukku', '/assets/garlic_murukku.jpeg', '₹50 / 150g', 'Crunchy Murukku infused with rich garlic flavor.'],
                    ['Ghee Murukku', '/assets/ghee_murukku.jpeg', '₹50 / 150g', 'Premium Murukku made with pure ghee.'],
                    ['Kadalai Muttai', '/assets/kadalai_muttai.jpeg', '₹70 / 200g', 'Healthy and sweet peanut brittle.'],
                    ['Kai Murukku', '/assets/kai_murukku.jpeg', '₹60 / 200g', 'Hand-twisted traditional Kai Murukku.'],
                    ['Kuchi Chips', '/assets/kuchi_chips.jpeg', '₹40 / 150g', 'Crispy potato stick chips.'],
                    ['Special Mixture', '/assets/mixture.jpeg', '₹60 / 200g', 'Our signature Special Mixture with premium nuts.'],
                    ['Nei Chilli', '/assets/nei_chilli.jpeg', '₹50 / 150g', 'Spicy chilli snacks fried in ghee.'],
                    ['Omapodi', '/assets/omapodi.jpeg', '₹60 / 200g', 'Fine and crispy Omapodi strands.'],
                    ['Pori Mixture', '/assets/pori_mixture.jpeg', '₹60 / 200g', 'Light and crunchy Pori Mixture.'],
                    ['Savu (Sev)', '/assets/savu.jpeg', '₹60 / 200g', 'Classic gram flour Sev.'],
                    ['Seeval', '/assets/seeval.jpeg', '₹60 / 200g', 'Traditional crunchy Seeval ribbons.'],
                    ['Thattai', '/assets/thattai.jpeg', '₹50 / 150g', 'Spicy, flat, and crispy Thattai.'],
                    ['Theankulal Chilli', '/assets/theankulal_chilli.jpeg', '₹50 / 150g', 'Spicy Theankulal Murukku.'],
                    ['Theankulal Murukku', '/assets/WhatsApp_Image_2026-07-09_at_10.16.55_PM.jpeg', '₹50 / 150g', 'Classic plain Theankulal Murukku.']
                ];
                $stmtInsert = $pdo->prepare("INSERT INTO landing_products (name, image, price, description, display_order) VALUES (?, ?, ?, ?, ?)");
                foreach ($seedData as $index => $prod) {
                    $stmtInsert->execute([$prod[0], $prod[1], $prod[2], $prod[3], $index]);
                }
            }

            $stmt = $pdo->query("SELECT * FROM landing_products ORDER BY display_order ASC, id ASC");
            $products = $stmt->fetchAll();
            echo json_encode(['success' => true, 'products' => $products]);
            exit;
        }
    }

    // === PROTECTED ENDPOINTS ===
    
    // Authenticate the user
    $authHeader = '';
    if (isset($_SERVER['HTTP_AUTHORIZATION'])) {
        $authHeader = trim($_SERVER['HTTP_AUTHORIZATION']);
    } elseif (isset($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
        $authHeader = trim($_SERVER['REDIRECT_HTTP_AUTHORIZATION']);
    }
    
    if (empty($authHeader) || !preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
        throw new Exception('Unauthorized: No token provided');
    }
    
    $token = $matches[1];
    $decoded = verifyToken($token);
    
    if (!$decoded || !isset($decoded['role']) || $decoded['role'] !== 'SUPER_ADMIN') {
        throw new Exception('Forbidden: Only SUPER_ADMIN can modify landing page CMS.');
    }

    $input = json_decode(file_get_contents('php://input'), true);

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        if ($action === 'save_settings') {
            if (!isset($input['settings']) || !is_array($input['settings'])) {
                throw new Exception('Invalid settings data.');
            }
            $stmt = $pdo->prepare("INSERT INTO landing_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?");
            foreach ($input['settings'] as $key => $value) {
                $stmt->execute([$key, $value, $value]);
            }
            echo json_encode(['success' => true]);
            exit;
        }

        if ($action === 'save_product') {
            $id = $input['id'] ?? null;
            $name = $input['name'] ?? '';
            $image = $input['image'] ?? '';
            $price = $input['price'] ?? '';
            $description = $input['description'] ?? '';
            $display_order = $input['display_order'] ?? 0;

            if (!$name || !$image || !$price || !$description) {
                throw new Exception('All product fields are required.');
            }

            if ($id) {
                $stmt = $pdo->prepare("UPDATE landing_products SET name = ?, image = ?, price = ?, description = ?, display_order = ? WHERE id = ?");
                $stmt->execute([$name, $image, $price, $description, $display_order, $id]);
            } else {
                $stmt = $pdo->prepare("INSERT INTO landing_products (name, image, price, description, display_order) VALUES (?, ?, ?, ?, ?)");
                $stmt->execute([$name, $image, $price, $description, $display_order]);
                $id = $pdo->lastInsertId();
            }
            echo json_encode(['success' => true, 'id' => $id]);
            exit;
        }
    }
    
    if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
        if ($action === 'delete_product') {
            $id = $_GET['id'] ?? null;
            if (!$id) {
                throw new Exception('Product ID is required.');
            }
            $stmt = $pdo->prepare("DELETE FROM landing_products WHERE id = ?");
            $stmt->execute([$id]);
            echo json_encode(['success' => true]);
            exit;
        }
    }

    throw new Exception('Invalid action or method.');

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
?>
