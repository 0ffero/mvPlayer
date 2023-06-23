<?php
function joinImagesAndExtrude($imageDir) {
    /*
        THIS FUNCTION JOINS THE 8 IMAGES TOGETHER THEN EXTRUDES THEM
        IT RESPONDS WITH THE SAVED DATA THATS HELD IN THE LOG

        REQUIREMENTS:
            motage.exe (cli from imagemagick package) -> https://imagemagick.org/script/download.php
            tile-extruder (node) -> npm install --global tile-extruder
    */
    $wDiv = 4; $hDiv = 1;
    $extrudeEXE = 'C:/Users/GATEWAY/AppData/Roaming/npm/node_modules/tile-extruder/bin/tile-extruder';
    $opFile = $imageDir . '/all.jpg';
    $extrudeImage = $imageDir . '/all_extrude.jpg';

    // Note: we initially check for the final extruded image (as opFile is deleted after successfully extruding)
    if (is_file($extrudeImage)){
        return 'Extruded file already exists :)';
    };

    // JOIN THE IMAGES
    $joinCommand = '..\\bin\\montage.exe ' . $imageDir . '/*.jpg -mode Concatenate -resize 320 -tile ' . $wDiv . 'x' . $hDiv . ' ' . $opFile; // these images will need extruded!
    shell_exec($joinCommand);

    // make sure the new file exists
    if (is_file($opFile)) { // it does, save the image size data (we dont really need this image to be saved, but I need it below to exture the file so its being generated anyway, might as well save it.. might come in handy to access it directly from the front end)
        $imageSize = getimagesize($opFile);
        $width = $imageSize[0];
        $height = $imageSize[1];
        $iImageWidth = $width/$wDiv;
        $iImageHeight = $height/$hDiv;
        $logFile = $imageDir . '/images.log';
        $saveData = ['width'=>$width, 'height'=>$height, 'rows'=>$hDiv, 'cols'=>$wDiv, 'imageWidth'=>$iImageWidth, 'imageHeight'=>$iImageHeight ];
        file_put_contents($logFile,json_encode($saveData));

        // EXTRUDE - USES NODEJS - so if it stops working itll be because the Path env var isnt set
        //              Add it to the Path environment variable (ie Environment Variables > Path > NEW = c:\path\to\nodeexefile)
        // as the atlas was created we now have to extrude it
        $extrudeCommand = 'node ' . $extrudeEXE . ' --tileWidth ' . $iImageWidth . ' --tileHeight ' . $iImageHeight . ' -e 0 -i ' . $opFile . ' -o ' . $extrudeImage;

        shell_exec($extrudeCommand);

        if (is_file($extrudeImage)) {
            // the extruded file was created, remove the all.jpg
            unlink($imageDir . '/all.jpg');
            // remove the individual files
            for ($i=1; $i<=4; $i++) {
                unlink($imageDir . "/previewImage_0$i.jpg");
            };
            $saveData['extrude'] = 'Successfully extruded and deleted the original file';
        } else {
            $saveData['extrude'] = 'failed';
        }
        return $saveData;
    } else { // OK, so we were unable to create the all.jpg file, add a failed message
        return 'Unable to join the images together!';
    }
}
?><?php

/* ENTRY */
include('jsonHeaders.php');

$timeDelta = 15;
$totalImages = 4;
$mvFolder = '../assets/musicVideos/';
$imageFolder = '../assets/mvimages/';

$ops = [];

//$canExit = false; // ENABLE ALL canExit vars to test a single run (generating 4 jpgs then joining for a single music video)

$scan = scandir($mvFolder);
foreach($scan as $fileName) {
    if (substr_count($fileName,'.mp4') || substr_count($fileName,'.webm')) {
        // get the sha of the filename
        $sha = hash('sha256', $fileName);
        $imageDir = $imageFolder . $sha;

         // does the images folder for this episode already exist?
        if (is_dir($imageDir)) {
            // check for the all.jpg if it doesnt exist create it
            $rs = joinImagesAndExtrude($imageDir);
            if (!is_array($rs)) { $op['failed'] = $rs; } else { $op['allImage'] = $rs; };
        } else { // THE IMAGE FILES DONT EXIST YET... GENERATE THEM
            /*
                CREATE A FOLDER WITH THE SHA
                AND START GENERATING THE IMAGES WITH FFMPEG
            
                ONCE ITS FINISHED OUTPUT THE OP ARRAY
            */
            mkdir($imageDir);
            $op = ['command'=>'','filename'=>$fileName, 'timeDelta'=>$timeDelta, 'sha256'=>$sha, 'result'=>''];
            $frameString = '';
            // CREATE THE 4 IMAGES
            for ($s=0; $s<$totalImages; $s++) {
                $t = $timeDelta*$s+0.5*$timeDelta;
                $int = $s+1;
                if ($int<10) { $int = "0$int"; }
                $command = 'E:\\www\\Apps\\tvEasy\\stream\\bin\\ffmpeg.exe -hide_banner -ss ' . $t . ' -i "' . $mvFolder . $fileName . '" -frames:v 1 "' . $imageDir . '/previewImage_' . $int . '.jpg"';
                shell_exec($command);
                $op['command'] .= $command . ';';
                $op['result'] .= 'frame=   ' . ($s+1) . "\r";
            }
            $op['result'] = trim($op['result']);
            
            // JOIN THE IMAGES TOGETHER AND EXTRUDE
            $rs = joinImagesAndExtrude($imageDir);
            if (!is_array($rs)) { $op['failed'] = $rs; } else { $op['allImage'] = $rs; };
            
            $ops[] = $op;

            //$canExit=true;
        };
    };

    //if ($canExit) { exit; };

};

// And output the result
echo json_encode($ops);
?>