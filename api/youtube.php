<?php
// api/youtube.php
require 'db.php';
header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];
$id = isset($_GET['id']) ? (int)$_GET['id'] : null;

try {
    if ($method === 'GET') {
        $stmt = $pdo->query("SELECT * FROM youtube_tracks ORDER BY display_order ASC");
        echo json_encode($stmt->fetchAll());
    }
    elseif ($method === 'POST') {
        $data = json_decode(file_get_contents('php://input'), true);
        $stmt = $pdo->prepare("INSERT INTO youtube_tracks (video_id, title, display_order) VALUES (?, ?, ?)");
        $stmt->execute([$data['video_id'], $data['title'], (int)$data['display_order']]);
        $newId = $pdo->lastInsertId();
        $data['id'] = (int)$newId;
        echo json_encode(['success' => true, 'video' => $data]);
    }
    elseif ($method === 'PUT') {
        if (!$id) { http_response_code(400); exit; }
        $data = json_decode(file_get_contents('php://input'), true);
        $stmt = $pdo->prepare("UPDATE youtube_tracks SET video_id=?, title=?, display_order=? WHERE id=?");
        $stmt->execute([$data['video_id'], $data['title'], (int)$data['display_order'], $id]);
        echo json_encode(['success' => true]);
    }
    elseif ($method === 'DELETE') {
        if (!$id) { http_response_code(400); exit; }
        $stmt = $pdo->prepare("DELETE FROM youtube_tracks WHERE id = ?");
        $stmt->execute([$id]);
        echo json_encode(['success' => true]);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>
