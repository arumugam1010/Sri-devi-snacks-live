<?php
require_once __DIR__ . '/db.php';

echo "<h2>Fixing Sunday Assignment...</h2>";

try {
    $db = getDatabaseConnection();
    
    // Check current ENUM values
    $stmt = $db->query("SHOW COLUMNS FROM schedules LIKE 'day_of_week'");
    $col = $stmt->fetch(PDO::FETCH_ASSOC);
    
    echo "Current column definition: " . htmlspecialchars($col['Type']) . "<br><br>";
    
    // Try to alter the table
    echo "Running ALTER TABLE...<br>";
    $db->exec("ALTER TABLE schedules MODIFY COLUMN day_of_week ENUM('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY') NOT NULL");
    
    // Check new ENUM values
    $stmt2 = $db->query("SHOW COLUMNS FROM schedules LIKE 'day_of_week'");
    $col2 = $stmt2->fetch(PDO::FETCH_ASSOC);
    
    echo "New column definition: " . htmlspecialchars($col2['Type']) . "<br><br>";
    
    echo "<h3 style='color:green;'>SUCCESS! Sunday is now allowed in the database.</h3>";
    
} catch (Exception $e) {
    echo "<h3 style='color:red;'>ERROR FAILED TO UPDATE DATABASE:</h3>";
    echo "<strong>Error Message:</strong> " . htmlspecialchars($e->getMessage());
}
