<?php
error_reporting(E_ALL & ~E_NOTICE & ~E_WARNING);
include('jsonHeaders.php');

$imageFolder = '../assets/mvimages/';

$lyricsArray = [];
$scan = scandir($imageFolder);
foreach($scan as $entry) {
    $lyrics='';
    $folderName = $imageFolder . $entry;
    if (is_dir($folderName) && $entry!='.'  && $entry!='..' ) {
        $lyricsFileName = $folderName . '/lyrics.txt';
        if (is_file($lyricsFileName)) {
            $lyrics = file_get_contents($lyricsFileName);
            $lyricsArray[] = ['sha'=>$entry, 'lyrics'=>$lyrics];
        };
    };
};


// output the array as json
$json = json_encode($lyricsArray);
echo $json;
?>