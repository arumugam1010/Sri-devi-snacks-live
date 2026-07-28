<?php
header('Content-Type: application/json');
require_once __DIR__ . '/db.php';

try {
    $db = getDatabaseConnection();
    $stmt = $db->query("SELECT id, shop_name FROM shops");
    $shops = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    $result = [];
    foreach ($shops as $shop) {
        $name = $shop['shop_name'];
        $hex = bin2hex($name);
        $len = mb_strlen($name, 'UTF-8');
        $chars = [];
        for ($i = 0; $i < $len; $i++) {
            $chars[] = mb_substr($name, $i, 1, 'UTF-8');
        }
        $result[] = [
            'id' => (int)$shop['id'],
            'shop_name' => $name,
            'len' => $len,
            'hex' => $hex,
            'chars' => $chars
        ];
    }
    
    echo json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
} catch (Exception $e) {
    echo json_encode(['error' => $e->getMessage()]);
}
