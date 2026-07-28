<?php
/**
 * Authentication Controller
 */

function handleAuthRoute($parts, $method) {
    $action = $parts[1] ?? '';
    
    switch ($action) {
        case 'login':
            if ($method !== 'POST') sendResponse(false, 'Method not allowed', null, 405);
            authLogin();
            break;
            
        case 'register':
            if ($method !== 'POST') sendResponse(false, 'Method not allowed', null, 405);
            authRegister();
            break;
            
        case 'verify':
            if ($method !== 'GET') sendResponse(false, 'Method not allowed', null, 405);
            authVerify();
            break;
            
        default:
            sendResponse(false, 'Action not found in auth', null, 404);
    }
}

/**
 * Handle POST /api/auth/login
 */
function authLogin() {
    $body = getJsonInput();
    $username = $body['username'] ?? '';
    $password = $body['password'] ?? '';
    
    if (empty($username) || empty($password)) {
        sendResponse(false, 'Username and password are required', null, 400);
    }
    
    $db = getDatabaseConnection();
    try {
        $stmt = $db->prepare("SELECT * FROM users WHERE username = :username LIMIT 1");
        $stmt->execute(['username' => $username]);
        $user = $stmt->fetch();
        
        if (!$user || !$user['isActive']) {
            sendResponse(false, 'Invalid credentials', null, 401);
        }
        
        // Plaintext comparison as in node backend
        if ($password !== $user['password']) {
            sendResponse(false, 'Invalid credentials', null, 401);
        }
        
        // Generate Token
        $payload = [
            'id' => (int)$user['id'],
            'username' => $user['username'],
            'email' => $user['email'],
            'name' => $user['name'],
            'role' => $user['role']
        ];
        
        $token = generateToken($payload);
        
        $userData = [
            'id' => (int)$user['id'],
            'name' => $user['name'],
            'username' => $user['username'],
            'email' => $user['email'],
            'role' => $user['role']
        ];
        
        sendResponse(true, 'Login successful', [
            'user' => $userData,
            'token' => $token
        ]);
        
    } catch (PDOException $e) {
        sendResponse(false, 'Database error: ' . $e->getMessage(), null, 500);
    }
}

/**
 * Handle POST /api/auth/register
 */
function authRegister() {
    $body = getJsonInput();
    $name = $body['name'] ?? '';
    $username = $body['username'] ?? '';
    $email = $body['email'] ?? '';
    $password = $body['password'] ?? '';
    $role = $body['role'] ?? 'USER';
    
    if (empty($name) || empty($username) || empty($email) || empty($password)) {
        sendResponse(false, 'Name, username, email and password are required', null, 400);
    }
    
    $db = getDatabaseConnection();
    try {
        // Check if email already exists
        $stmt = $db->prepare("SELECT id FROM users WHERE email = :email LIMIT 1");
        $stmt->execute(['email' => $email]);
        if ($stmt->fetch()) {
            sendResponse(false, 'User already exists with this email', null, 409);
        }
        
        // Check if username already exists
        $stmt = $db->prepare("SELECT id FROM users WHERE username = :username LIMIT 1");
        $stmt->execute(['username' => $username]);
        if ($stmt->fetch()) {
            sendResponse(false, 'Username already exists', null, 409);
        }
        
        // Insert new user (Note: plaintext password matching node backend configuration)
        $stmt = $db->prepare("INSERT INTO users (name, username, email, password, role, isActive) VALUES (:name, :username, :email, :password, :role, 1)");
        $stmt->execute([
            'name' => $name,
            'username' => $username,
            'email' => $email,
            'password' => $password,
            'role' => $role
        ]);
        
        $userId = $db->lastInsertId();
        
        $payload = [
            'id' => (int)$userId,
            'username' => $username,
            'email' => $email,
            'name' => $name,
            'role' => $role
        ];
        
        $token = generateToken($payload);
        
        $userData = [
            'id' => (int)$userId,
            'name' => $name,
            'username' => $username,
            'email' => $email,
            'role' => $role
        ];
        
        sendResponse(true, 'Registration successful', [
            'user' => $userData,
            'token' => $token
        ], 201);
        
    } catch (PDOException $e) {
        sendResponse(false, 'Database error: ' . $e->getMessage(), null, 500);
    }
}

/**
 * Handle GET /api/auth/verify
 */
function authVerify() {
    $user = getAuthenticatedUser();
    
    $db = getDatabaseConnection();
    try {
        $stmt = $db->prepare("SELECT id, name, email, role, isActive FROM users WHERE id = :id LIMIT 1");
        $stmt->execute(['id' => $user['id']]);
        $dbUser = $stmt->fetch();
        
        if (!$dbUser || !$dbUser['isActive']) {
            sendResponse(false, 'Invalid token or user inactive', null, 401);
        }
        
        $userData = [
            'id' => (int)$dbUser['id'],
            'name' => $dbUser['name'],
            'email' => $dbUser['email'],
            'role' => $dbUser['role']
        ];
        
        sendResponse(true, 'Token is valid', [
            'user' => $userData
        ]);
        
    } catch (PDOException $e) {
        sendResponse(false, 'Database error: ' . $e->getMessage(), null, 500);
    }
}
