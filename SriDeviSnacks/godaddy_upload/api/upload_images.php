<?php
require_once __DIR__ . '/jwt.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/env_loader.php';

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

try {
    // Authenticate the user safely without getallheaders()
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
    
    if (!$decoded) {
        throw new Exception('Unauthorized: Invalid token');
    }
    
    // We can enforce SUPER_ADMIN role here if we want to be strict
    if (!isset($decoded['role']) || $decoded['role'] !== 'SUPER_ADMIN') {
        throw new Exception('Forbidden: Only SUPER_ADMIN can upload landing page images.');
    }

    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception('Invalid request method. Expected POST.');
    }

    if (!isset($_FILES['image']) || $_FILES['image']['error'] !== UPLOAD_ERR_OK) {
        throw new Exception('No image file uploaded or an upload error occurred.');
    }

    if (!isset($_POST['filename']) || empty($_POST['filename'])) {
        throw new Exception('Filename not specified.');
    }

    $targetFileName = basename($_POST['filename']);
    
    // Validate filename to prevent directory traversal
    if (!preg_match('/^[a-zA-Z0-9_\-\.]+$/', $targetFileName)) {
        throw new Exception('Invalid filename provided.');
    }

    // The target path should be ../assets/ relative to the api directory
    // godaddy_upload/api/ -> godaddy_upload/assets/
    $targetDir = dirname(__DIR__) . '/assets/';
    $targetFilePath = $targetDir . $targetFileName;

    // Validate file type
    $fileType = strtolower(pathinfo($_FILES['image']['name'], PATHINFO_EXTENSION));
    $allowedTypes = array('jpg', 'jpeg', 'png', 'webp');
    if (!in_array($fileType, $allowedTypes)) {
        throw new Exception('Invalid file type. Only JPG, JPEG, PNG, and WEBP files are allowed.');
    }

    // Attempt to move the uploaded file
    if (move_uploaded_file($_FILES['image']['tmp_name'], $targetFilePath)) {
        // Also copy it to frontend/public/assets if running locally so dev environment updates too
        // Also copy it to frontend/public/assets if running locally (for dev)
        $localFrontendDir = dirname(dirname(__DIR__)) . '/frontend/public/assets/';
        if (is_dir($localFrontendDir)) {
            $localFilePath = $localFrontendDir . $targetFileName;
            copy($targetFilePath, $localFilePath);
        }

        echo json_encode([
            'success' => true,
            'message' => 'Image uploaded successfully.',
            'filename' => $targetFileName
        ]);
    } else {
        throw new Exception('Failed to move uploaded file.');
    }

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
?>
