<?php
// api/meta.php
require 'db.php';
header('Content-Type: application/json');

// Return last modified time of the database (approximated by current time as MySQL is live)
// Or we can query the latest upload_date for a more accurate "last update"
try {
    $stmt = $pdo->query("SELECT MAX(upload_date) as last_mod FROM tracks");
    $row = $stmt->fetch();
    $lastMod = $row['last_mod'] ?? date('Y-m-d H:i:s');
    
    echo json_encode(['lastModified' => $lastMod]);
} catch (Exception $e) {
    // If DB fails, return null or empty
    echo json_encode(['lastModified' => null]);
}
?>
