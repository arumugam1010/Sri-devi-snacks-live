<?php
/**
 * Settings Controller
 */

function handleSettingsRoute($parts, $method) {
    // Auth check
    getAuthenticatedUser();

    if ($method === 'GET') {
        getSettings();
    } elseif ($method === 'PUT') {
        requireAdminUser();
        updateSetting();
    } else {
        sendResponse(false, 'Method not allowed', null, 405);
    }
}

/**
 * Handle GET /api/settings
 */
function getSettings() {
    $db = getDatabaseConnection();
    try {
        $stmt = $db->query("SELECT setting_key, setting_value FROM settings");
        $settings = $stmt->fetchAll(PDO::FETCH_KEY_PAIR);
        sendResponse(true, '', $settings);
    } catch (PDOException $e) {
        sendResponse(false, 'Database error: ' . $e->getMessage(), null, 500);
    }
}

/**
 * Handle PUT /api/settings
 */
function updateSetting() {
    $input = getJsonInput();
    $db = getDatabaseConnection();
    try {
        if (isset($input['settings']) && is_array($input['settings'])) {
            // Bulk update
            $db->beginTransaction();
            $stmt = $db->prepare("INSERT INTO settings (setting_key, setting_value) 
                                 VALUES (:key, :value) 
                                 ON DUPLICATE KEY UPDATE setting_value = :value_update");
            foreach ($input['settings'] as $item) {
                if (isset($item['key']) && isset($item['value'])) {
                    $stmt->execute([
                        'key' => $item['key'],
                        'value' => (string)$item['value'],
                        'value_update' => (string)$item['value']
                    ]);
                }
            }
            $db->commit();
            sendResponse(true, 'Settings updated successfully');
        } else {
            // Single update
            if (!isset($input['key']) || !isset($input['value'])) {
                sendResponse(false, 'Key and Value are required', null, 400);
            }
            $key = $input['key'];
            $value = $input['value'];
            
            $stmt = $db->prepare("INSERT INTO settings (setting_key, setting_value) 
                                 VALUES (:key, :value) 
                                 ON DUPLICATE KEY UPDATE setting_value = :value_update");
            $stmt->execute([
                'key' => $key,
                'value' => (string)$value,
                'value_update' => (string)$value
            ]);
            sendResponse(true, 'Setting updated successfully', [$key => $value]);
        }
    } catch (PDOException $e) {
        if ($db->inTransaction()) {
            $db->rollBack();
        }
        sendResponse(false, 'Database error: ' . $e->getMessage(), null, 500);
    }
}
