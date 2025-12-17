<?php
// api/settings.php
require 'db.php';
header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];
$key = isset($_GET['key']) ? $_GET['key'] : null;

try {
    // GET (Retrieve a setting, specifically master_password hash)
    // IMPORTANT: In a real app we wouldn't return the password hash publicly easily,
    // but here the client needs it to validte "Entry" locally as per current design.
    // Or we should validate ON SERVER.
    // Given current architecture: JS checks if hash matches.
    
    if ($method === 'GET') {
        if ($key) {
            $stmt = $pdo->prepare("SELECT key_value FROM settings WHERE key_name = ?");
            $stmt->execute([$key]);
            $row = $stmt->fetch();
            // Return raw value (hash)
            echo json_encode(['success' => true, 'value' => $row['key_value'] ?? null]);
        } else {
            // List all? No, security risk.
            http_response_code(403);
            echo json_encode(['error' => 'Key required']);
        }
    }
    
    // POST (Update a setting)
    elseif ($method === 'POST') {
        $data = json_decode(file_get_contents('php://input'), true);
        if (!isset($data['key']) || !isset($data['value'])) {
             http_response_code(400); exit;
        }

        // Allow updating master_password
        $stmt = $pdo->prepare("INSERT INTO settings (key_name, key_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE key_value = ?");
        $stmt->execute([$data['key'], $data['value'], $data['value']]);
        
        echo json_encode(['success' => true]);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>
