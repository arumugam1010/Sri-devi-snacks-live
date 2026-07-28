<?php
/**
 * Simple .env file loader and parser
 */
function loadEnv($dir) {
    // Check in the current directory first, then the parent directory
    $paths = [
        $dir . '/.env',
        dirname($dir) . '/backend/.env',
        dirname($dir) . '/.env'
    ];

    foreach ($paths as $path) {
        if (file_exists($path)) {
            $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
            foreach ($lines as $line) {
                // Ignore comments
                if (strpos(trim($line), '#') === 0) {
                    continue;
                }
                
                // Parse Key=Value
                if (strpos($line, '=') !== false) {
                    list($name, $value) = explode('=', $line, 2);
                    $name = trim($name);
                    $value = trim($value);
                    
                    // Remove enclosing quotes
                    $value = trim($value, '"\'');
                    
                    putenv("{$name}={$value}");
                    $_ENV[$name] = $value;
                    $_SERVER[$name] = $value;
                }
            }
            return true;
        }
    }
    return false;
}

// Load env relative to current directory
loadEnv(__DIR__);
