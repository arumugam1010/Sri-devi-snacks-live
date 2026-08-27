<?php

function handleGstFilingsRoute($parts, $method) {
    $db = getDatabaseConnection();
    requireSuperAdminOrAccounts();

    if ($method === 'GET') {
        $stmt = $db->prepare("SELECT * FROM gst_filings WHERE is_filed = 1 ORDER BY filed_at DESC");
        $stmt->execute();
        $filings = $stmt->fetchAll();
        sendResponse(true, 'GST filings retrieved', $filings);
    } 
    elseif ($method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        $monthYear = $input['month_year'] ?? '';
        $isFiled = isset($input['is_filed']) ? (int)$input['is_filed'] : 1;
        
        if (empty($monthYear)) {
            sendResponse(false, 'Month/Year is required', null, 400);
        }

        if ($isFiled) {
            $stmt = $db->prepare("INSERT INTO gst_filings (month_year, is_filed) VALUES (?, 1) ON DUPLICATE KEY UPDATE is_filed = 1, filed_at = CURRENT_TIMESTAMP");
            $stmt->execute([$monthYear]);
        } else {
            $stmt = $db->prepare("DELETE FROM gst_filings WHERE month_year = ?");
            $stmt->execute([$monthYear]);
        }

        sendResponse(true, 'GST filing status updated', ['month_year' => $monthYear, 'is_filed' => $isFiled]);
    } else {
        sendResponse(false, 'Method Not Allowed', null, 405);
    }
}
