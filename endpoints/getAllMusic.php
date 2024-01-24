<?php
function cleanExit($op) {
    echo json_encode($op);
    exit;
};
function listFolderFiles($dir) {
    
    $allowed = ['mp3','flac','m4a'];
    $imageTypes = ['jpg','png','gif'];
    
    $file_names = array();
    foreach (new DirectoryIterator($dir) as $fileInfo) {
        if (!$fileInfo->isDot()) {

            if ($fileInfo->isDir()) {

                // checking directory empty or not, if not then append list     
                $pathName = $fileInfo->getPathname();
                $mainFolder = explode(DIRECTORY_SEPARATOR, $pathName);
                $mainFolder = $mainFolder[count($mainFolder)-1];
                $isDirEmpty = !(new \FilesystemIterator($pathName))->valid();

                if($isDirEmpty != 1) {
                    $file_names[] = listFolderFiles($fileInfo->getPathname());
                };

            } else {
                $pathName = str_replace($GLOBALS['topDir'],'',$fileInfo->getPathname());
                $fileExtension = explode('.',$pathName);
                $fileExtension = strtolower($fileExtension[count($fileExtension)-1]);
                if (in_array($fileExtension,$allowed)) {
                    $file_names[] = $pathName;  
                };
            };
        };
        
    };


    // Splicing Array 
    for ($i=0; $i<count($file_names); $i++) {
        if (is_array($file_names[$i])) {
            array_splice($file_names, $i, 1, $file_names[$i]);
        };
    };


    return $file_names;
}




$op = [];
$GLOBALS['topDir'] = '..' . DIRECTORY_SEPARATOR . 'assets' . DIRECTORY_SEPARATOR . 'music' . DIRECTORY_SEPARATOR;
if (!is_dir($GLOBALS['topDir'])) {
    $op['ERROR'] = 'No Music';
    cleanExit($op);
};

$res = listFolderFiles($GLOBALS['topDir']);

if (!count($res)) {
    $op['ERROR'] = 'No Music';
    cleanExit($op);
};

$op['music'] = $res;
// output
cleanExit($op);
?>