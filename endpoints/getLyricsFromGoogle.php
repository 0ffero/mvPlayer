<?php
function cleanExit($op) {
    echo json_encode($op);
    exit;
};
/*
ORIGINAL JS FOR GETTING THE LYRICS FROM A GOOGLE SEARCH
let div = document.querySelector("div[jsname='WbKHeb']")

let dn = "\n\n";
let lyrics = ''
for (let c=0; c< div.children.length; c++) {
    let text = div.children[c].innerText;
    lyrics+=text + dn;
};

console.log(lyrics);
*/
if (!isset($_POST['title'])) {
    $searchString='Beastie Boys - Intergalactic lyrics';
};

$searchString = str_replace(' ','%20',$searchString);

$url = "https://www.google.com/search?q=$searchString";

$lyricsSearchResultText = file_get_contents($url);

if (!$lyricsSearchResultText) {
    $op = ['ERROR'=>'Response from google was empty!'];
    cleanExit($op);
};

file_put_contents('./rsfromgoogle.txt', $lyricsSearchResultText);

$dom = new DOMDocument();

// fix html5/svg errors
libxml_use_internal_errors(true);
       
// Load html
$dom->loadHTML($lyricsSearchResultText);
$xpath = new DOMXPath($dom);


$entries = $xpath->query("div[jsname='WbKHeb']");

if (!$entries->length) {
    $op = ['ERROR'=>'Couldnt find the lyrics div!'];
    cleanExit($op);
};

foreach ($entries as $entry) {
    echo "$entry->nodeValue},<br/>\n";
};

?>