<?php
// saveToJson.php
// Receives JSON payload via POST and saves/updates a JSON file identified by a sha.
// Returns JSON { success: bool, sha: string, message: string }

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed. Use POST.']);
    exit;
}

$raw = file_get_contents('php://input');
if ($raw === false || $raw === '') {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Empty request body.']);
    exit;
}

$data = json_decode($raw, true);
if (json_last_error() !== JSON_ERROR_NONE) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid JSON: ' . json_last_error_msg()]);
    exit;
}

// Minimal validation / normalization
$artist   = isset($data['artist']) ? trim($data['artist']) : null;
$track    = isset($data['track'])  ? trim($data['track'])  : null;
$body     = array_key_exists('body', $data) ? $data['body'] : null;
$album    = array_key_exists('album', $data) ? $data['album'] : null;
$duration = array_key_exists('duration', $data) ? $data['duration'] : null;
$when     = array_key_exists('when', $data) ? $data['when'] : null;
$providedSha = isset($data['sha']) ? $data['sha'] : null;

if (empty($artist) || empty($track)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Missing required fields: artist and track.']);
    exit;
}

// storage directory (next to this script)
$storageDir = __DIR__ . DIRECTORY_SEPARATOR . 'data';
if (!is_dir($storageDir)) {
    if (!mkdir($storageDir, 0755, true)) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Unable to create storage directory.']);
        exit;
    }
}

// sanitize provided sha256
$sha = null;
if ($providedSha) {
    if (preg_match('/^[0-9a-fA-F]{64}$/', $providedSha)) {
        $sha = strtolower($providedSha);
    } else {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid sha format. Must be a 64-character hexadecimal string.']);
        exit;
    };
}

$filename = $storageDir . DIRECTORY_SEPARATOR . $sha . '.json';
$tempFile = $filename . '.tmp';

// Prepare payload to save
$toSave = [
    'sha' => $sha,
    'artist' => $artist,
    'track' => $track,
    'album' => $album,
    'duration' => $duration,
    'when' => $when,
    // store original body (lyrics, notes, etc.)
    'mvData' => $body,
    'mvOffset' => 0,
    'saved_at' => date('c'),
];

// Encode
$json = json_encode($toSave, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
if ($json === false) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Failed to encode JSON.']);
    exit;
}

// Write atomically: write to temp file then rename
$written = @file_put_contents($tempFile, $json, LOCK_EX);
if ($written === false) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Failed to write file.']);
    @unlink($tempFile);
    exit;
}

if (!@rename($tempFile, $filename)) {
    // try fallback: copy then unlink
    if (!@copy($tempFile, $filename) || !@unlink($tempFile)) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to finalize save file.']);
        exit;
    }
}

http_response_code(200);
echo json_encode([
    'success' => true,
    'sha' => $sha,
    'path' => 'data/' . basename($filename),
    'message' => file_exists($filename) ? 'Saved' : 'Created'
]);