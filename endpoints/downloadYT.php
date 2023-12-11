<?php
include('jsonHeaders.php');

if (!isset($_POST['id']) || strlen($_POST['id'])!==11) {
    $op = ['ERROR'=>'ID was invalid'];
    echo json_encode($op);
    exit;
};

$id = $_POST['id'];

$thisFolder = getcwd();

/*
    ***************************************************
    * Check if this video has already been downloaded *
    ***************************************************
*/
$append = false;
$logFile = '../assets/download.log';
if (is_file($logFile)) {
    $logData = file_get_contents($logFile);
    if (substr_count($logData,$id)) {
        $op = ['ERROR'=>'Music video has already been downloaded'];
        echo json_encode($op);
        exit;
    };

    $append = true;
};



/*
    **********************
    * Download the video *
    **********************
*/
$url = 'https://www.youtube.com/watch?v=' . $id;
chdir("../assets/musicVideos");
/* 
   *************************************
   *         !!! IMPORTANT !!!         *
   *                                   *
   * Change This To Wherever YT-DLP is *
   *************************************
*/
$dlp = "C:/Users/GATEWAY/AppData/Local/Programs/Python/Python312/Scripts/yt-dlp.exe";
if (!is_file($dlp)) {
    $op = ['ERROR'=>'Unable to find yt-dlp executable. Edit it in downloadYT.php'];
    echo json_encode($op);
    exit;
}
$exeOutput = shell_exec("$dlp -f mp4 $url");
$exeOPArray = explode("\r", $exeOutput);

$lengthOfArray = count($exeOPArray);
if (!$lengthOfArray) {
    $op = ['ERROR'=>'Output from request was invalid!'];
    echo json_encode($op);
    exit;
};
$ytdlRequest = explode("\n",$exeOPArray[0]);



/*
    ******************************
    *   RENAME THE SAVED VIDEO   *
    *                            *
    * This removes all the extra *
    * info in the songs name     *
    ******************************
*/
$replace = [" [$id]"," (Official HD Video)"," (Official Music Video)"," [Official Music Video]"," (Official 4K Video)"," (Official Audio)"," (Official Video)"," (Official Lyric Video)"," MUSIC VIDEO", " (HD REMASTER)"," [4K]","()","[]"];
// FIND THE NAME OF THE SAVED FILE
$lookingFor = '[download] Destination: ';
$savedAs = '';
foreach ($ytdlRequest as $opLine) {
    if (substr_count($opLine,$lookingFor) && !$savedAs) { // the line were looking for
        $savedAs = str_replace($lookingFor,'',$opLine);
        $op['filename_original'] = $savedAs;
    };
};
if (!$savedAs || !is_file($savedAs)) {
    $op['log'] = 'Unable to find the file name of the video! Unable to rename the file.';
} else {
    $rename = trim(str_replace($replace, "", $savedAs));
    if (strlen($rename)>4) { // new file name looks good, rename it
        rename($savedAs,$rename); $op['filename_clean'] = $rename;
        $op['sha256'] = hash('sha256', $rename);
    };
};



/* 
    **********************
    * Set up output vars *
    **********************
*/
// grab the first and last array positions
$last = $exeOPArray[$lengthOfArray-1];
if (!substr_count($last,'100%')) {
    $op['WARNING'] = 'Didnt find 100% in output. Make sure that this file finished downloading!';
} else { // found 100%, add the id to the downloaded log
    chdir($thisFolder);
    $append ? file_put_contents($logFile, "\n" . $id, FILE_APPEND) : file_put_contents($logFile, $id);
};

$op['ytRequest'] = $ytdlRequest;
$op['ytResponse'] = $last;

echo json_encode($op);

?>