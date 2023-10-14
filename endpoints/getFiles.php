<?php
error_reporting(E_ALL & ~E_NOTICE & ~E_WARNING);
include('jsonHeaders.php');
include('./tools/deltree.php');

$drive = "../assets/musicVideos/";
$imageFolder = '..\\assets\\mvimages\\';

$optionsDefaults = json_encode(["introEnd"=>0,"outroStart"=>null,"musicVideoImageOverride"=>false,"lyrics"=>'']);
$genreDefaults = json_encode([]);
/*  
    ***********************
    * GET ALL VIDEO FILES *
    ***********************
*/
$shaArray = [];
$scan = scandir($drive);
foreach($scan as $entry) {
    if (substr_count($entry,'.mp4') || substr_count($entry,'.webm')) {
        $sha = hash('sha256', $entry);
        $shaArray[] = $sha; // these are used to check for unused image folders
        $folder = $imageFolder . $sha;
        if (!is_dir($folder)) { mkdir($folder); };
        $hasImages = is_file($folder . '\\all_extrude.jpg') ? true : false;

        // deal with the OPTIONS files
        $options = $optionsDefaults;
        $optFile = $folder . '\\options.cfg';
        if (!is_file($optFile)) { // options.cfg doesnt exist yet
            // generate a default options.cfg for this sha
            file_put_contents($optFile, $options);
        } else { // OPTIONS file exists, load it
            $options = file_get_contents($optFile);
        };

        // get the new GENRES file
        $genreFile = $folder . '\\genres.cfg';
        $genres = $genreDefaults;
        if (!is_file($genreFile)) { // genres.cfg doesnt exist yet
            // generate a default genres.cfg for this sha
            file_put_contents($genreFile, $genres);
        } else { // GENRES file exists, load it
            $genres = file_get_contents($genreFile);
        };

        // add the data to the files object
        $files[]=["mvName"=>htmlentities($entry), "sha256"=>$sha, "hasImages"=>$hasImages, "options"=>json_decode($options), "genres"=>json_decode($genres)];
    };
};
sort($files);



/*  
    **********************************
    * CHECK FOR UNUSED IMAGE FOLDERS *
    **********************************
*/
$scan = scandir($imageFolder);
$deletable = [];
foreach($scan as $entry) {
    if (strlen($entry)===64) { // valid sha size, check if this sha still exists
        if (!in_array($entry,$shaArray)) { // this sha is NOT in the array (deletable folder)
            $deletable[] = $entry;
            deltree($imageFolder . $entry);
        };
    };
};

if (count($deletable)) {
    $deletedLog = '../assets/deleted.log';
    if (is_file($deletedLog)) {
        file_put_contents($deletedLog, "\n" . implode("\n",$deletable), FILE_APPEND);
    } else {
        file_put_contents($deletedLog, implode("\n",$deletable));
    };
};



/*
    **********
    * OUTPUT *
    **********
*/

$json = html_entity_decode(json_encode($files));
if (json_last_error()) { // if there was an error creating the json, output it
    echo json_encode(json_last_error_msg()); exit;
};

echo $json;
?>