<?php
/**
 * Main index.php Entry Point and API Router
 */

// Set default timezone to Indian Standard Time (IST)
date_default_timezone_set('Asia/Kolkata');

// Global CORS Headers
$allowedOrigins = [
    'http://localhost:5173',
    'https://sridevisnacks.vercel.app'
];
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $allowedOrigins)) {
    header("Access-Control-Allow-Origin: " . $origin);
} else {
    header("Access-Control-Allow-Origin: *");
}
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Content-Type: application/json; charset=UTF-8");

// Handle CORS Preflight OPTIONS requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Load configurations and helpers
require_once __DIR__ . '/env_loader.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/jwt.php';

// Helper function to send standard JSON responses
function sendResponse($success, $message = '', $data = null, $status = 200) {
    http_response_code($status);
    $response = ['success' => $success];
    if ($message !== '') $response['message'] = $message;
    if ($data !== null) $response['data'] = $data;
    echo json_encode($response);
    exit;
}

// Helper to get raw JSON input data
function getJsonInput() {
    $raw = file_get_contents('php://input');
    if (empty($raw)) return [];
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

// Middleware: Authenticate and get JWT token claims
function getAuthenticatedUser() {
    $token = getBearerToken();
    if (!$token) {
        sendResponse(false, 'Unauthorized: No token provided', null, 401);
    }
    $decoded = verifyToken($token);
    if (!$decoded) {
        sendResponse(false, 'Unauthorized: Invalid or expired token', null, 401);
    }
    return $decoded;
}

// Middleware: Require ADMIN or SUPER_ADMIN
function requireAdminUser() {
    $user = getAuthenticatedUser();
    if (!isset($user['role']) || !in_array($user['role'], ['ADMIN', 'SUPER_ADMIN'])) {
        sendResponse(false, 'Forbidden: Admin access required', null, 403);
    }
    return $user;
}

// Middleware: Require SUPER_ADMIN
function requireSuperAdminUser() {
    $user = getAuthenticatedUser();
    if (!isset($user['role']) || $user['role'] !== 'SUPER_ADMIN') {
        sendResponse(false, 'Forbidden: Super Admin access required', null, 403);
    }
    return $user;
}

// Middleware: Require SUPER_ADMIN or ACCOUNTS
function requireSuperAdminOrAccounts() {
    $user = getAuthenticatedUser();
    if (!isset($user['role']) || !in_array($user['role'], ['SUPER_ADMIN', 'ACCOUNTS'])) {
        sendResponse(false, 'Forbidden: Restricted access', null, 403);
    }
    return $user;
}

// Parse request URL relative to the script location
$requestUri = $_SERVER['REQUEST_URI'];
$scriptName = $_SERVER['SCRIPT_NAME'];
$baseDir = str_replace('\\', '/', dirname($scriptName));
if ($baseDir === '/') {
    $baseDir = '';
}

// Strip query parameters
$path = parse_url($requestUri, PHP_URL_PATH);

// Remove baseDir from path
if (!empty($baseDir) && stripos($path, $baseDir) === 0) {
    $path = substr($path, strlen($baseDir));
}

// Strip leading/trailing slashes
$path = trim($path, '/');
$parts = explode('/', $path);

$module = $parts[0] ?? '';
$action = $parts[1] ?? '';

// Routing Table
switch ($module) {
    case 'auth':
        require_once __DIR__ . '/controllers/auth.php';
        handleAuthRoute($parts, $_SERVER['REQUEST_METHOD']);
        break;
    case 'employees':
        require_once __DIR__ . '/controllers/employees.php';
        handleEmployeesRoute($parts, $_SERVER['REQUEST_METHOD']);
        break;
    case 'users':
        require_once __DIR__ . '/controllers/users.php';
        handleUsersRoute($parts, $_SERVER['REQUEST_METHOD']);
        break;
    case 'shops':
        require_once __DIR__ . '/controllers/shops.php';
        handleShopsRoute($parts, $_SERVER['REQUEST_METHOD']);
        break;
    case 'products':
        require_once __DIR__ . '/controllers/products.php';
        handleProductsRoute($parts, $_SERVER['REQUEST_METHOD']);
        break;
    case 'stocks':
        require_once __DIR__ . '/controllers/stocks.php';
        handleStocksRoute($parts, $_SERVER['REQUEST_METHOD']);
        break;
    case 'gst-filings':
        require_once __DIR__ . '/controllers/gst_filings.php';
        handleGstFilingsRoute($parts, $_SERVER['REQUEST_METHOD']);
        break;
    case 'bills':
        require_once __DIR__ . '/controllers/bills.php';
        handleBillsRoute($parts, $_SERVER['REQUEST_METHOD']);
        break;
    case 'schedules':
        require_once __DIR__ . '/controllers/schedules.php';
        handleSchedulesRoute($parts, $_SERVER['REQUEST_METHOD']);
        break;
    case 'dashboard':
        require_once __DIR__ . '/controllers/dashboard.php';
        handleDashboardRoute($parts, $_SERVER['REQUEST_METHOD']);
        break;
    case 'settings':
        require_once __DIR__ . '/controllers/settings.php';
        handleSettingsRoute($parts, $_SERVER['REQUEST_METHOD']);
        break;
    case 'fuel-expenses':
        require_once __DIR__ . '/controllers/fuel_expenses.php';
        handleFuelExpensesRoute($parts, $_SERVER['REQUEST_METHOD']);
        break;
    case 'suppliers':
        require_once __DIR__ . '/controllers/suppliers.php';
        handleSuppliersRoute($parts, $_SERVER['REQUEST_METHOD']);
        break;
    case 'purchase-bills':
        require_once __DIR__ . '/controllers/purchase_bills.php';
        handlePurchaseBillsRoute($parts, $_SERVER['REQUEST_METHOD']);
        break;
    case 'bakery-products':
        require_once __DIR__ . '/controllers/bakery_products.php';
        handleBakeryProductsRoute($parts, $_SERVER['REQUEST_METHOD']);
        break;
    case 'bakery-bills':
        require_once __DIR__ . '/controllers/bakery_bills.php';
        handleBakeryBillsRoute($parts, $_SERVER['REQUEST_METHOD']);
        break;
    case 'debug-db':
        try {
            $db = getDatabaseConnection();
            $phpTimezone = date_default_timezone_get();
            $phpTime = date('Y-m-d H:i:s');
            $dbTime = $db->query("SELECT NOW()")->fetchColumn();
            $dbTimezone = $db->query("SELECT @@session.time_zone")->fetchColumn();
            
            $recentBills = $db->query("SELECT id, bill_number, total_amount, received_amount, pending_amount, bill_date, status FROM bills ORDER BY id DESC LIMIT 10")->fetchAll(PDO::FETCH_ASSOC);
            $recentPayments = $db->query("SELECT * FROM bill_payments ORDER BY id DESC LIMIT 10")->fetchAll(PDO::FETCH_ASSOC);
            
            $startOfDay = date('Y-m-d 00:00:00');
            $endOfDay = date('Y-m-d 23:59:59');
            
            $stmt = $db->prepare("SELECT COUNT(*), SUM(total_amount) FROM bills WHERE bill_date >= :start AND bill_date <= :end");
            $stmt->execute(['start' => $startOfDay, 'end' => $endOfDay]);
            $todaysBills = $stmt->fetch(PDO::FETCH_NUM);
            
            $stmt2 = $db->prepare("SELECT COUNT(*), SUM(amount) FROM bill_payments WHERE payment_date >= :start AND payment_date <= :end");
            $stmt2->execute(['start' => $startOfDay, 'end' => $endOfDay]);
            $todaysPayments = $stmt2->fetch(PDO::FETCH_NUM);

            sendResponse(true, 'Debug info', [
                'diagnostics' => [
                    'php_timezone' => $phpTimezone,
                    'php_time' => $phpTime,
                    'db_time' => $dbTime,
                    'db_timezone' => $dbTimezone,
                    'query_start' => $startOfDay,
                    'query_end' => $endOfDay
                ],
                'todays_bills_count' => (int)$todaysBills[0],
                'todays_bills_sum' => (float)$todaysBills[1],
                'todays_payments_count' => (int)$todaysPayments[0],
                'todays_payments_sum' => (float)$todaysPayments[1],
                'recent_bills' => $recentBills,
                'recent_payments' => $recentPayments
            ]);
        } catch (Exception $e) {
            sendResponse(false, $e->getMessage());
        }
        break;
    case 'health':
        sendResponse(true, 'Billing System API (PHP) is running', [
            'timestamp' => date('c'),
            'env' => getenv('NODE_ENV') ?: 'production'
        ]);
        break;
    default:
        sendResponse(false, 'Route not found: ' . $path, null, 404);
}