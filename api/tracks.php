<?php
// api/tracks.php
require 'db.php';

header('Content-Type: application/json');

// Helper to format rows
function formatRow($row) {
    return [
        'id' => (int)$row['id'],
        'title' => $row['title'],
        'genre' => $row['genre'],
        'image' => $row['image'],
        'audio' => $row['audio'],
        'bandcamp' => $row['bandcamp'],
        'uploadDate' => $row['upload_date'],
        'stats' => [
            'views' => (int)$row['views'],
            'downloads' => (int)$row['downloads'],
            'wavClicks' => (int)$row['wav_clicks']
        ]
    ];
}

$method = $_SERVER['REQUEST_METHOD'];
$id = isset($_GET['id']) ? (int)$_GET['id'] : null;

try {
    // GET (List or Single)
    if ($method === 'GET') {
        if ($id) {
            $stmt = $pdo->prepare("SELECT * FROM tracks WHERE id = ?");
            $stmt->execute([$id]);
            $track = $stmt->fetch();
            if ($track) echo json_encode(['success' => true, 'track' => formatRow($track)]);
            else http_response_code(404);
        } else {
            $stmt = $pdo->query("SELECT * FROM tracks ORDER BY upload_date DESC");
            $tracks = array_map('formatRow', $stmt->fetchAll());
            echo json_encode($tracks);
        }
    }

    // POST (Add)
    elseif ($method === 'POST') {
        $data = json_decode(file_get_contents('php://input'), true);
        
        $sql = "INSERT INTO tracks (title, genre, image, audio, bandcamp, upload_date) VALUES (?, ?, ?, ?, ?, NOW())";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            $data['title'],
            $data['genre'],
            $data['image'],
            $data['audio'],
            $data['bandcamp']
        ]);
        
        $newId = $pdo->lastInsertId();
        $data['id'] = (int)$newId;
        echo json_encode(['success' => true, 'track' => $data]);
    }

    // PUT (Update)
    elseif ($method === 'PUT') {
        if (!$id) { http_response_code(400); exit; }
        $data = json_decode(file_get_contents('php://input'), true);

        $sql = "UPDATE tracks SET title=?, genre=?, image=?, audio=?, bandcamp=? WHERE id=?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            $data['title'],
            $data['genre'],
            $data['image'],
            $data['audio'],
            $data['bandcamp'],
            $id
        ]);

        echo json_encode(['success' => true]);
    }

    // DELETE
    elseif ($method === 'DELETE') {
        if (!$id) { http_response_code(400); exit; }
        $stmt = $pdo->prepare("DELETE FROM tracks WHERE id = ?");
        $stmt->execute([$id]);
        echo json_encode(['success' => true]);
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>
