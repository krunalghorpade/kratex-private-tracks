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
$host = ($_ENV['DB_HOST'] ?? '127.0.0.1') === 'localhost' ? '127.0.0.1' : ($_ENV['DB_HOST'] ?? '127.0.0.1');
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
    
    // 4. Initialization (Auto-Create Tables)
    
    // Core Tracks
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
        wav_clicks INT DEFAULT 0,
        plays INT DEFAULT 0
    )");

    // Ensure 'plays' column exists (migration for existing)
    try {
        $pdo->exec("ALTER TABLE tracks ADD COLUMN plays INT DEFAULT 0");
    } catch (Exception $e) { /* Ignore if exists */ }

    // M-House Tracks
    $pdo->exec("CREATE TABLE IF NOT EXISTS mhouse_tracks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        genre VARCHAR(255),
        image TEXT,
        audio TEXT,
        bandcamp VARCHAR(255),
        upload_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        views INT DEFAULT 0,
        downloads INT DEFAULT 0,
        wav_clicks INT DEFAULT 0,
        plays INT DEFAULT 0
    )");

    // Banners
    $pdo->exec("CREATE TABLE IF NOT EXISTS banners (
        id INT AUTO_INCREMENT PRIMARY KEY,
        image_path TEXT NOT NULL,
        link_url TEXT,
        display_order INT DEFAULT 0
    )");

    // YouTube Tracks (Kratex Originals)
    $pdo->exec("CREATE TABLE IF NOT EXISTS youtube_tracks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        video_id VARCHAR(50) NOT NULL,
        title VARCHAR(255),
        display_order INT DEFAULT 0
    )");

    // Settings (Master Password)
    $pdo->exec("CREATE TABLE IF NOT EXISTS settings (
        key_name VARCHAR(50) PRIMARY KEY,
        key_value TEXT
    )");

    // Insert Default Master Password (hashed) if not exists
    // Using simple hash for demo or consistent with SHA-256 logic
    // We'll store it but frontend does hashing. 
    // Actually, user wants to change it. We should seed it.
    // Default: 'adminpass123' (SHA-256: 240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9)
    $defaultPassHash = "fc613b4dfd6736a7bd268c8a0e74ed0d1c04a959f59dd74ef2874983fd443fc9"; // This is 'master' hash from secrets.js
    $stmt = $pdo->prepare("INSERT IGNORE INTO settings (key_name, key_value) VALUES ('master_password', ?)");
    $stmt->execute([$defaultPassHash]);

} catch (\PDOException $e) {
    // If connection fails, return 500
    http_response_code(500);
    echo json_encode(['error' => 'Database Connection Failed: ' . $e->getMessage()]);
    exit;
}
?>
