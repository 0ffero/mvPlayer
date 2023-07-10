<?php
error_reporting(E_ALL & ~E_NOTICE & ~E_WARNING);
include('jsonHeaders.php');

$op = null;
$cacheFolder = '../assets/mvimages/';

// does the SHA look valid?
if (!isset($_POST['sha']) || strlen($_POST['sha'])!==64) {
    $op = ['valid'=>false];
    $op = ['ERROR'=>'SHA was invalid'];
    echo json_encode($op);
    exit;
};
$sha = $_POST['sha'];

// does the config file exist?
$mvFolder = $cacheFolder . $sha;
$fileName = $mvFolder . '/genres.cfg';
if (!is_file($fileName)) {
    $op = ['valid'=>false];
    $op = ['ERROR'=>"Genre file for $sha wasnt found!"];
    echo json_encode($op);
    exit;
};
$genres = json_decode(file_get_contents($fileName),true);

// has the genere been passed?
if (!isset($_POST['genre'])) {
    $op = ['valid'=>false];
    $op = ['ERROR'=>'Genre wasn\'t sent!'];
    echo json_encode($op);
    exit;
};
$genre = strtolower($_POST['genre']);

// post vars look valid


// check if the genre is valid
$allowed = ['blues','comedy','dance','dubstep','electronic','folk','grunge','hiphop','indie','industrial','metal','misc','pop','punk','rap','rock'];

if (!in_array($genre,$allowed)) {
    $op = ['valid'=>false];
    $valid = implode(',',$allowed);
    $op = ['ERROR'=>'Genre wasn\'t found in the allowed list! Unable to add!', "Allowed"=>$valid];
    echo json_encode($op);
    exit;
};


// the genre is valid
if (in_array($genre, $genres)) { // remove it
    $op = ['valid'=>true, 'COMMENT'=>'Removed from genre file'];
    $remove = array_search($genre, $genres);
    unset($genres[$remove]);
} else { // add it
    $op = ['valid'=>true, 'COMMENT'=>'Added to genre file'];
    $genres[]=$genre;
};

// push the genres back into the file
file_put_contents($fileName, json_encode($genres));

// output the op array
echo json_encode($op);
?>