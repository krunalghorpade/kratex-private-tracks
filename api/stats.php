<?php
// api/stats.php
require 'db.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);
$id = isset($data['id']) ? (int)$data['id'] : null;
$type = isset($data['type']) ? $data['type'] : null;

if (!$id || !$type) {
    http_response_code(400);
    exit;
}

try {
    $col = '';
    if ($type === 'view') $col = 'views';
    elseif ($type === 'download') $col = 'downloads';
    elseif ($type === 'wav') $col = 'wav_clicks';
    elseif ($type === 'play') $col = 'plays';

    if ($col) {
        $stmt = $pdo->prepare("UPDATE tracks SET $col = $col + 1 WHERE id = ?");
        $stmt->execute([$id]);

        // Return updated stats
        $stmt = $pdo->prepare("SELECT views, downloads, wav_clicks, plays FROM tracks WHERE id = ?");
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        
        $stats = [
            'views' => (int)$row['views'],
            'downloads' => (int)$row['downloads'],
            'wavClicks' => (int)$row['wav_clicks'],
            'plays' => (int)($row['plays'] ?? 0)
        ];
        
        echo json_encode(['success' => true, 'stats' => $stats]);
    } else {
        echo json_encode(['success' => true]);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>
