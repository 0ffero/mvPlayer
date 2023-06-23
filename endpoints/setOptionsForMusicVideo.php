<?php
include('jsonHeaders.php');
$op = [];
function generateError($op) {
    echo json_encode($op);
    exit;
};

/* VALIDATE INCOMING VARS */
if ( !isset($_POST['value']) || !isset($_POST['sha']) || !isset($_POST['which']) ) {
    $op = ['ERROR'=>'No value, sha or which was passed'];
    generateError($op);
};

$value = $_POST['value'];

$sha = $_POST['sha'];
if (strlen($sha)!==64) {
    $op = ['ERROR'=>"Invalid sha ($sha) sent!"];
    generateError($op);
};
$which = $_POST['which'];
if ($which!=='introEnd' && $which!=='outroStart' && $which!='lyrics') {
    $op = ['ERROR'=>"Invalid which ($which) sent!"];
    generateError($op);
};
/* END OF VALIDATION */




/* UPDATE THE OPTIONS */
$optionsFile = '../assets/mvimages/' . $sha . '/options.cfg';
if (!is_file($optionsFile)) { // the config file doesnt exist!
    $op = ['ERROR'=>"Option file for sha $sha wasnt found.. unable to update config. Nb: If you see this message the getFiles.php isnt generating the config file!"];
    generateError($op);
};

// EVERYTHING IS GOOD, DO THE THING

$json = json_decode(file_get_contents($optionsFile), true);

switch ($which) {
    case 'introEnd':
        $json["introEnd"] = $value*1;
    break;

    case 'outroStart':
        $json["outroStart"] = $value*1;
    break;
        
    case 'lyrics':
        $json["lyrics"] = $value;
    break;

    case 'musicVideoImageOverride':
        $json["musicVideoImageOverride"] = $value==='true' ? true : false;
    break;

    default:
        $op = ['ERROR'=>"$which doesnt have a function assigned to it yet. Add it to this endpoint."];
        generateError($op);
    break;
};

$op['updated'] = "$which to $value";
$op['sha'] = $sha;

/* SAVE THE UPDATED OPTIONS INTO THE CFG FILE */
file_put_contents($optionsFile, json_encode($json));

echo json_encode($op);
?>