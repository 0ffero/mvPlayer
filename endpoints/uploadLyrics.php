<?php
include('jsonHeaders.php');

if (!isset($_POST['sha']) || strlen($_POST['sha'])!==64) {
    $op = ['valid'=>false];
    $op = ['ERROR'=>'SHA was invalid'];
    echo json_encode($op);
    exit;
};

if (!isset($_POST['lyrics'])) {
    $op = ['valid'=>false];
    $op = ['ERROR'=>'Lyrics weren\'t sent!'];
    echo json_encode($op);
    exit;
};

$overwrite = false;
if (isset($_POST['overwrite'])) {
    $overwrite = true;
};

$sha = $_POST['sha'];
if (trim($sha, '0..9A..Fa..f') !== '') {
    $op = ['valid'=>false];
    $op = ['ERROR'=>'SHA was correct length but invalid. Please confirm the sha.'];
    echo json_encode($op);
    exit;
}
$folder = "../assets/mvimages/$sha/";

if (!is_dir($folder)) {
    $op = ['valid'=>false];
    $op = ['ERROR'=>"No folder found for $sha"];
    echo json_encode($op);
    exit;
};

$lyrics = $_POST['lyrics'];

$fileName = $folder . "lyrics.txt";
if (is_file($fileName) && !$overwrite) {
    $op = ['valid'=>false];
    $op = ['ERROR'=>"Lyrics already exist for $sha. If you want to overwrite them add the overwrite var to the POST"];
    echo json_encode($op);
    exit;
};

file_put_contents($fileName, $lyrics);

$op = ['valid'=>true];
echo json_encode($op);

?>