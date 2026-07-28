<?php
/**
 * WhatsApp Notification Utility
 */

require_once __DIR__ . '/../db.php';

function sendWhatsAppAlert($message) {
    try {
        $db = getDatabaseConnection();
        
        // Fetch WhatsApp settings
        $stmt = $db->query("SELECT setting_key, setting_value FROM settings WHERE setting_key LIKE 'whatsapp_%'");
        $settings = $stmt->fetchAll(PDO::FETCH_KEY_PAIR);
        
        $enabled = isset($settings['whatsapp_enabled']) ? filter_var($settings['whatsapp_enabled'], FILTER_VALIDATE_BOOLEAN) : false;
        if (!$enabled) {
            return false;
        }
        
        $phone = $settings['whatsapp_phone'] ?? '9943206339';
        $provider = $settings['whatsapp_provider'] ?? 'ultramsg';
        $token = $settings['whatsapp_api_token'] ?? '';
        $instanceId = $settings['whatsapp_instance_id'] ?? '';
        
        if (empty($phone)) {
            return false;
        }
        
        // Ensure India country code (91) is prefixed if it's a 10-digit number
        $phone = preg_replace('/[^0-9]/', '', $phone);
        if (strlen($phone) === 10) {
            $phone = '91' . $phone;
        }
        
        if ($provider === 'ultramsg') {
            if (empty($instanceId) || empty($token)) {
                return false;
            }
            
            $url = "https://api.ultramsg.com/" . $instanceId . "/messages/chat";
            $data = [
                'token' => $token,
                'to' => $phone,
                'body' => $message
            ];
            
            $ch = curl_init();
            curl_setopt($ch, CURLOPT_URL, $url);
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($data));
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_TIMEOUT, 10);
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
            curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
            curl_exec($ch);
            curl_close($ch);
            
            return true;
        } else {
            // Fallback: custom webhook url (if provided in token)
            $webhookUrl = $settings['whatsapp_webhook_url'] ?? $token;
            if (empty($webhookUrl)) {
                return false;
            }
            
            $data = json_encode([
                'phone' => $phone,
                'message' => $message
            ]);
            
            $ch = curl_init();
            curl_setopt($ch, CURLOPT_URL, $webhookUrl);
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, $data);
            curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_TIMEOUT, 10);
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
            curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
            curl_exec($ch);
            curl_close($ch);
            
            return true;
        }
    } catch (\Exception $e) {
        // Silent fail to not break the billing flow if WhatsApp fails
        return false;
    }
}
