<?php
// api/upload.php
require 'db.php'; // Included mainly for consistency, though uploads are FS-based.

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    exit;
}

$uploadDir = __DIR__ . '/../assets/uploads/';
if (!file_exists($uploadDir)) {
    mkdir($uploadDir, 0755, true);
}

$result = [];
$title = $_POST['title'] ?? 'upload';

// Sanitization: "My New Track" -> "My_New_Track"
$safeTitle = preg_replace('/\s+/', '_', trim($title));
$safeTitle = preg_replace('/[^a-zA-Z0-9_]/', '', $safeTitle);
$timestamp = time();

// Helper
function handleUpload($fileKey, $prefix, $uploadDir, $safeTitle, $timestamp) {
    if (isset($_FILES[$fileKey]) && $_FILES[$fileKey]['error'] === UPLOAD_ERR_OK) {
        $tmpName = $_FILES[$fileKey]['tmp_name'];
        $originalName = $_FILES[$fileKey]['name'];
        $ext = pathinfo($originalName, PATHINFO_EXTENSION);
        
        $fileName = "{$safeTitle}_{$timestamp}.{$ext}";
        $targetPath = $uploadDir . $fileName;

        if (move_uploaded_file($tmpName, $targetPath)) {
            // Return path relative to root
            return "assets/uploads/" . $fileName;
        }
    }
    return null;
}

$imagePath = handleUpload('image', 'img', $uploadDir, $safeTitle, $timestamp);
if ($imagePath) $result['imagePath'] = $imagePath;

$audioPath = handleUpload('audio', 'audio', $uploadDir, $safeTitle, $timestamp);
if ($audioPath) $result['audioPath'] = $audioPath;

echo json_encode($result);
?>
