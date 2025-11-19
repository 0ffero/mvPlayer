<?php

$storageDir = __DIR__ . DIRECTORY_SEPARATOR . 'data';
if (!is_dir($storageDir)) {
    if (!mkdir($storageDir, 0755, true)) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Storage directory Not Found and Unable to create!']);
        exit;
    };

    $savedLyrics = [];
    echo json_encode(['success' => true, 'data' => $savedLyrics]);
    exit;
};

$files = glob($storageDir . DIRECTORY_SEPARATOR . '*.json');
$savedLyrics = [];
foreach ($files as $file) {
    $content = file_get_contents($file);
    if ($content === false) {
        continue; // skip unreadable files
    };
    $data = json_decode($content, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        continue; // skip invalid JSON files
    };
    $savedLyrics[] = $data;
};

echo json_encode(['success' => true, 'data' => $savedLyrics]);

exit;