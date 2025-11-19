<?php
// saveTimedOffset.php
// Expects application/x-www-form-urlencoded POST with 'sha' (sha256 hex) and 'offset' (float)

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'method_not_allowed']);
    exit;
}

$sha = isset($_POST['sha']) ? trim($_POST['sha']) : null;
$offset = isset($_POST['offset']) ? $_POST['offset'] : null;

// validate sha (64 hex chars) and offset (numeric)
if (!is_string($sha) || !preg_match('/^[0-9a-fA-F]{64}$/', $sha)) {
    http_response_code(400);
    echo json_encode(['error' => 'invalid_sha']);
    exit;
}
if (!is_numeric($offset)) {
    http_response_code(400);
    echo json_encode(['error' => 'invalid_offset']);
    exit;
}

$offset = floatval($offset);
$baseDir = __DIR__ . '/data/';
$filePath = $baseDir . $sha . '.json';

// ensure file exists
if (!is_file($filePath) || !is_readable($filePath)) {
    http_response_code(404);
    echo json_encode(['error' => 'file_not_found']);
    exit;
}

$json = file_get_contents($filePath);
if ($json === false) {
    http_response_code(500);
    echo json_encode(['error' => 'read_failed']);
    exit;
}

$data = json_decode($json, true);
if ($data === null && json_last_error() !== JSON_ERROR_NONE) {
    http_response_code(500);
    echo json_encode(['error' => 'invalid_json']);
    exit;
}

// Update mvOffset
$data['mvOffset'] = $offset;

// Write back to file
$newJson = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
if ($newJson === false) {
    http_response_code(500);
    echo json_encode(['error' => 'encode_failed']);
    exit;
}

if (file_put_contents($filePath, $newJson, LOCK_EX) === false) {
    http_response_code(500);
    echo json_encode(['error' => 'write_failed']);
    exit;
}

echo json_encode(['ok'=>true, 'sha'=>$sha, 'mvOffset'=>$offset]);