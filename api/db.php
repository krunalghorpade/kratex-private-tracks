<?php
// api/db.php

// 1. Load Environment Variables from .env file
function loadEnv($path) {
    if (!file_exists($path)) return;
    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos(trim($line), '#') === 0) continue;
        list($name, $value) = explode('=', $line, 2);
        $_ENV[trim($name)] = trim($value);
    }
}

// Load .env from root directory (parent of api)
loadEnv(__DIR__ . '/../.env');

// 2. Database Configuration
$host = $_ENV['DB_HOST'] ?? 'localhost';
$db   = $_ENV['DB_NAME'] ?? '';
$user = $_ENV['DB_USER'] ?? '';
$pass = $_ENV['DB_PASS'] ?? '';
$charset = 'utf8mb4';

// 3. Connect to MySQL
$dsn = "mysql:host=$host;dbname=$db;charset=$charset";
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
];

try {
    $pdo = new PDO($dsn, $user, $pass, $options);
    
    // 4. Initialization (Auto-Create Table)
    $pdo->exec("CREATE TABLE IF NOT EXISTS tracks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        genre VARCHAR(255),
        image TEXT,
        audio TEXT,
        bandcamp VARCHAR(255),
        upload_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        views INT DEFAULT 0,
        downloads INT DEFAULT 0,
        wav_clicks INT DEFAULT 0
    )");

} catch (\PDOException $e) {
    // If connection fails, return 500
    http_response_code(500);
    echo json_encode(['error' => 'Database Connection Failed: ' . $e->getMessage()]);
    exit;
}
?>
