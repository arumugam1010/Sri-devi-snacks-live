<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST, OPTIONS");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$data = json_decode(file_get_contents("php://input"));

if (isset($data->name) && isset($data->email) && isset($data->message)) {
    $to = "santhanamvlr@gmail.com";
    $subject = isset($data->subject) && !empty($data->subject) ? "Sri Devi Snacks Contact: " . $data->subject : "Sri Devi Snacks Contact: New Message";
    $message = "Name: " . $data->name . "\n"
             . "Email: " . $data->email . "\n"
             . "Subject: " . $data->subject . "\n"
             . "Message: \n" . $data->message;
    
    // Ensure email is valid to prevent header injection
    $from_email = filter_var($data->email, FILTER_SANITIZE_EMAIL);
    if (!filter_var($from_email, FILTER_VALIDATE_EMAIL)) {
        $from_email = "no-reply@sridevisnacks.com";
    }

    $headers = "From: contactform@sridevisnacks.com\r\n";
    $headers .= "Reply-To: " . $from_email . "\r\n";
    
    if (mail($to, $subject, $message, $headers)) {
        echo json_encode(["status" => "success", "message" => "Email sent successfully"]);
    } else {
        http_response_code(500);
        echo json_encode(["status" => "error", "message" => "Failed to send email"]);
    }
} else {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Missing required fields"]);
}
?>
