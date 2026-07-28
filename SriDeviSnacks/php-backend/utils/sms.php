<?php
/**
 * SMS Notification Utility (Fast2SMS)
 */

require_once __DIR__ . '/../db.php';

function sendSMSAlert($message) {
    try {
        $db = getDatabaseConnection();
        
        // Fetch SMS settings
        $stmt = $db->query("SELECT setting_key, setting_value FROM settings WHERE setting_key LIKE 'sms_%'");
        $settings = $stmt->fetchAll(PDO::FETCH_KEY_PAIR);
        
        $enabled = isset($settings['sms_enabled']) ? filter_var($settings['sms_enabled'], FILTER_VALIDATE_BOOLEAN) : false;
        if (!$enabled) {
            return false;
        }
        
        $phone = $settings['sms_phone'] ?? '9943206339';
        $apiKey = $settings['sms_api_key'] ?? '';
        
        if (empty($phone) || empty($apiKey)) {
            return false;
        }
        
        // Split by comma to clean up multiple numbers
        $numbersArr = explode(',', $phone);
        $cleanNumbers = [];
        foreach ($numbersArr as $num) {
            $numClean = preg_replace('/[^0-9]/', '', $num);
            if (strlen($numClean) > 10) {
                $numClean = substr($numClean, -10);
            }
            if (strlen($numClean) === 10) {
                $cleanNumbers[] = $numClean;
            }
        }
        
        if (empty($cleanNumbers)) {
            return false;
        }
        
        $phoneList = implode(',', $cleanNumbers);
        
        // Call Fast2SMS API using cURL (more reliable on GoDaddy than file_get_contents)
        $url = "https://www.fast2sms.com/dev/bulkV2?authorization=" . urlencode($apiKey) . "&route=q&message=" . urlencode($message) . "&language=english&flash=0&numbers=" . urlencode($phoneList);
        
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 10);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
        $response = curl_exec($ch);
        curl_close($ch);
        
        return true;
    } catch (\Exception $e) {
        return false;
    }
}
