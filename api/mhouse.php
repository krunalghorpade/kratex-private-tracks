<?php
// api/mhouse.php
require 'db.php';
header('Content-Type: application/json');

function formatRow($row) {
    return [
        'id' => (int)$row['id'],
        'title' => $row['title'],
        'genre' => $row['genre'],
        'image' => $row['image'],
        'audio' => $row['audio'],
        'bandcamp' => $row['bandcamp'],
        'uploadDate' => $row['upload_date'],
        'stats' => [ // Include empty stats structure for consistency
            'views' => (int)($row['views'] ?? 0),
            'downloads' => (int)($row['downloads'] ?? 0),
            'wavClicks' => (int)($row['wav_clicks'] ?? 0),
            'plays' => (int)($row['plays'] ?? 0)
        ]
    ];
}

$method = $_SERVER['REQUEST_METHOD'];
$id = isset($_GET['id']) ? (int)$_GET['id'] : null;

try {
    if ($method === 'GET') {
        if ($id) {
            $stmt = $pdo->prepare("SELECT * FROM mhouse_tracks WHERE id = ?");
            $stmt->execute([$id]);
            $track = $stmt->fetch();
            if ($track) echo json_encode(['success' => true, 'track' => formatRow($track)]);
            else http_response_code(404);
        } else {
            $stmt = $pdo->query("SELECT * FROM mhouse_tracks ORDER BY upload_date DESC");
            $tracks = array_map('formatRow', $stmt->fetchAll());
            echo json_encode($tracks);
        }
    }
    elseif ($method === 'POST') {
        $data = json_decode(file_get_contents('php://input'), true);
        $stmt = $pdo->prepare("INSERT INTO mhouse_tracks (title, genre, image, audio, bandcamp, upload_date) VALUES (?, ?, ?, ?, ?, NOW())");
        $stmt->execute([$data['title'], $data['genre'], $data['image'], $data['audio'], $data['bandcamp']]);
        $newId = $pdo->lastInsertId();
        $data['id'] = (int)$newId;
        echo json_encode(['success' => true, 'track' => $data]);
    }
    elseif ($method === 'PUT') {
        if (!$id) { http_response_code(400); exit; }
        $data = json_decode(file_get_contents('php://input'), true);
        $stmt = $pdo->prepare("UPDATE mhouse_tracks SET title=?, genre=?, image=?, audio=?, bandcamp=? WHERE id=?");
        $stmt->execute([$data['title'], $data['genre'], $data['image'], $data['audio'], $data['bandcamp'], $id]);
        echo json_encode(['success' => true]);
    }
    elseif ($method === 'DELETE') {
        if (!$id) { http_response_code(400); exit; }
        $stmt = $pdo->prepare("DELETE FROM mhouse_tracks WHERE id = ?");
        $stmt->execute([$id]);
        echo json_encode(['success' => true]);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>
