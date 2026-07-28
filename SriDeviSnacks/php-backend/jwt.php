<?php
/**
 * Lightweight JSON Web Token (JWT) implementation using HMAC SHA-256
 */

require_once __DIR__ . '/env_loader.php';

function getJwtSecret() {
    return getenv('JWT_SECRET') ?: ($_ENV['JWT_SECRET'] ?? 'fallback-secret-key');
}

function base64UrlEncode($data) {
    return str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($data));
}

function base64UrlDecode($data) {
    $remainder = strlen($data) % 4;
    if ($remainder) {
        $padlen = 4 - $remainder;
        $data .= str_repeat('=', $padlen);
    }
    return base64_decode(str_replace(['-', '_'], ['+', '/'], $data));
}

/**
 * Generate a JWT token
 */
function generateToken($payload) {
    $secret = getJwtSecret();
    
    // Add default token claims
    $payload['iat'] = time();
    $payload['exp'] = time() + (24 * 60 * 60); // 24 hours expiry
    
    $header = json_encode(['alg' => 'HS256', 'typ' => 'JWT']);
    $base64UrlHeader = base64UrlEncode($header);
    $base64UrlPayload = base64UrlEncode(json_encode($payload));
    
    $signature = hash_hmac('sha256', $base64UrlHeader . "." . $base64UrlPayload, $secret, true);
    $base64UrlSignature = base64UrlEncode($signature);
    
    return $base64UrlHeader . "." . $base64UrlPayload . "." . $base64UrlSignature;
}

/**
 * Verify and decode a JWT token
 */
function verifyToken($token) {
    $secret = getJwtSecret();
    $parts = explode('.', $token);
    
    if (count($parts) !== 3) {
        return false;
    }
    
    list($header, $payload, $signature) = $parts;
    
    $validSig = hash_hmac('sha256', $header . "." . $payload, $secret, true);
    $validSignatureEncoded = base64UrlEncode($validSig);
    
    if (!hash_equals($validSignatureEncoded, $signature)) {
        return false;
    }
    
    $decodedPayload = json_decode(base64UrlDecode($payload), true);
    
    // Check expiration
    if (isset($decodedPayload['exp']) && $decodedPayload['exp'] < time()) {
        return false; // Expired
    }
    
    return $decodedPayload;
}

/**
 * Extract token from Authorization header
 */
function getBearerToken() {
    $headers = null;
    if (isset($_SERVER['Authorization'])) {
        $headers = trim($_SERVER["Authorization"]);
    } elseif (isset($_SERVER['HTTP_AUTHORIZATION'])) { // Nginx or fast CGI
        $headers = trim($_SERVER["HTTP_AUTHORIZATION"]);
    } elseif (function_exists('apache_request_headers')) {
        $requestHeaders = apache_request_headers();
        // Server-side fix for bug in old Apache versions
        $requestHeaders = array_combine(array_map('ucwords', array_keys($requestHeaders)), array_values($requestHeaders));
        if (isset($requestHeaders['Authorization'])) {
            $headers = trim($requestHeaders['Authorization']);
        }
    }
    
    if (!empty($headers)) {
        if (preg_match('/Bearer\s(\S+)/', $headers, $matches)) {
            return $matches[1];
        }
    }
    return null;
}
