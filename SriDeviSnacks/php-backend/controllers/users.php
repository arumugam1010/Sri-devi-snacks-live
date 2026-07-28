<?php
/**
 * Users Controller
 */

function handleUsersRoute($parts, $method) {
    $action = $parts[1] ?? '';
    
    // GET /users/profile
    if ($action === 'profile' && $method === 'GET') {
        getUserProfile();
        return;
    }
    
    // All other users routes require admin privilege
    requireAdminUser();
    
    if (empty($action)) {
        if ($method === 'GET') {
            getUsersList();
        } else {
            sendResponse(false, 'Method not allowed', null, 405);
        }
        return;
    }
    
    // GET /users/:id or PATCH /users/:id/status
    if (is_numeric($action)) {
        $userId = (int)$action;
        $subAction = $parts[2] ?? '';
        
        if (empty($subAction)) {
            if ($method === 'GET') {
                getUserById($userId);
            } else {
                sendResponse(false, 'Method not allowed', null, 405);
            }
        } elseif ($subAction === 'status' && $method === 'PATCH') {
            updateUserStatus($userId);
        } else {
            sendResponse(false, 'Action not found', null, 404);
        }
        return;
    }
    
    sendResponse(false, 'Action not found in users', null, 404);
}

/**
 * Handle GET /api/users/profile
 */
function getUserProfile() {
    $user = getAuthenticatedUser();
    $db = getDatabaseConnection();
    
    try {
        $stmt = $db->prepare("SELECT id, name, email, role, isActive, createdAt, updatedAt FROM users WHERE id = :id LIMIT 1");
        $stmt->execute(['id' => $user['id']]);
        $dbUser = $stmt->fetch();
        
        if (!$dbUser) {
            sendResponse(false, 'User not found', null, 404);
        }
        
        // Cast ID
        $dbUser['id'] = (int)$dbUser['id'];
        $dbUser['isActive'] = (bool)$dbUser['isActive'];
        
        sendResponse(true, '', $dbUser);
    } catch (PDOException $e) {
        sendResponse(false, 'Database error: ' . $e->getMessage(), null, 500);
    }
}

/**
 * Handle GET /api/users
 */
function getUsersList() {
    $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
    $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 10;
    $search = isset($_GET['search']) ? $_GET['search'] : '';
    $sortBy = isset($_GET['sortBy']) ? $_GET['sortBy'] : 'createdAt';
    $sortOrder = isset($_GET['sortOrder']) && strtolower($_GET['sortOrder']) === 'asc' ? 'asc' : 'desc';
    
    // Whitelist sort fields to prevent SQL injection
    $allowedSortFields = ['id', 'name', 'email', 'role', 'isActive', 'createdAt', 'updatedAt'];
    if (!in_array($sortBy, $allowedSortFields)) {
        $sortBy = 'createdAt';
    }
    
    $offset = ($page - 1) * $limit;
    
    $db = getDatabaseConnection();
    try {
        $whereSql = "";
        $params = [];
        
        if ($search !== '') {
            $whereSql = "WHERE name LIKE :search1 OR email LIKE :search2";
            $params['search1'] = '%' . $search . '%';
            $params['search2'] = '%' . $search . '%';
        }
        
        // Count query
        $countStmt = $db->prepare("SELECT COUNT(*) FROM users {$whereSql}");
        $countStmt->execute($params);
        $total = (int)$countStmt->fetchColumn();
        
        // Data query
        $querySql = "SELECT id, name, email, role, isActive, createdAt, updatedAt 
                     FROM users 
                     {$whereSql} 
                     ORDER BY {$sortBy} {$sortOrder} 
                     LIMIT :limit OFFSET :offset";
                     
        $stmt = $db->prepare($querySql);
        
        // Bind pagination params
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        foreach ($params as $key => $val) {
            $stmt->bindValue(':' . $key, $val);
        }
        
        $stmt->execute();
        $users = $stmt->fetchAll();
        
        // Format types
        foreach ($users as &$u) {
            $u['id'] = (int)$u['id'];
            $u['isActive'] = (bool)$u['isActive'];
        }
        
        $totalPages = ceil($total / $limit);
        
        echo json_encode([
            'success' => true,
            'data' => $users,
            'pagination' => [
                'page' => $page,
                'limit' => $limit,
                'total' => $total,
                'totalPages' => $totalPages,
                'hasNext' => $page < $totalPages,
                'hasPrev' => $page > 1
            ]
        ]);
        exit;
    } catch (PDOException $e) {
        sendResponse(false, 'Database error: ' . $e->getMessage(), null, 500);
    }
}

/**
 * Handle GET /api/users/:id
 */
function getUserById($userId) {
    $db = getDatabaseConnection();
    try {
        $stmt = $db->prepare("SELECT id, name, email, role, isActive, createdAt, updatedAt FROM users WHERE id = :id LIMIT 1");
        $stmt->execute(['id' => $userId]);
        $user = $stmt->fetch();
        
        if (!$user) {
            sendResponse(false, 'User not found', null, 404);
        }
        
        $user['id'] = (int)$user['id'];
        $user['isActive'] = (bool)$user['isActive'];
        
        sendResponse(true, '', $user);
    } catch (PDOException $e) {
        sendResponse(false, 'Database error: ' . $e->getMessage(), null, 500);
    }
}

/**
 * Handle PATCH /api/users/:id/status
 */
function updateUserStatus($userId) {
    $body = getJsonInput();
    if (!isset($body['isActive']) || !is_bool($body['isActive'])) {
        sendResponse(false, 'isActive must be a boolean', null, 400);
    }
    
    $isActive = $body['isActive'] ? 1 : 0;
    
    $db = getDatabaseConnection();
    try {
        // Check if user exists
        $stmt = $db->prepare("SELECT id FROM users WHERE id = :id LIMIT 1");
        $stmt->execute(['id' => $userId]);
        if (!$stmt->fetch()) {
            sendResponse(false, 'User not found', null, 404);
        }
        
        // Update status
        $stmt = $db->prepare("UPDATE users SET isActive = :isActive, updatedAt = NOW() WHERE id = :id");
        $stmt->execute([
            'isActive' => $isActive,
            'id' => $userId
        ]);
        
        // Fetch updated user
        $stmt = $db->prepare("SELECT id, name, email, role, isActive, updatedAt FROM users WHERE id = :id");
        $stmt->execute(['id' => $userId]);
        $updatedUser = $stmt->fetch();
        
        $updatedUser['id'] = (int)$updatedUser['id'];
        $updatedUser['isActive'] = (bool)$updatedUser['isActive'];
        
        $statusMsg = $body['isActive'] ? 'activated' : 'deactivated';
        sendResponse(true, "User {$statusMsg} successfully", $updatedUser);
    } catch (PDOException $e) {
        sendResponse(false, 'Database error: ' . $e->getMessage(), null, 500);
    }
}
