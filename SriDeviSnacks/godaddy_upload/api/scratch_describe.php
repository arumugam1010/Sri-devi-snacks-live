<?php
require_once __DIR__ . '/../../godaddy_upload/api/db.php';

try {
    $db = getDatabaseConnection();
    $stmt = $db->query("DESCRIBE products");
    $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode($columns, JSON_PRETTY_PRINT);
} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
