"use strict"
var vars = {
    /*
            REQUIREMENTS:
                PHP 5+
                assets/musicVideos/ folder can either be a real folder or a
                junction link to another folder
                WINDOWS: 
                    cd assets
                    mklink /J musicvideos drive:folder-with-music-videos
                LINUX:
                    Dont really know tbh. Im sure youll figure it out :)
                    NOT RECOMMENDED -   Currently the new music player assumes windows dir structure
                                        This is a problem because we dont have a script that determines
                                        if the server is linux or not. So, the php lister for music will
                                        work on linux or windows, however the js that deals with the
                                        response wont know if it should be looking for / or \

                IMPORTANT:
                    Music videos should be in mp4 or webm format


                YT-DLP - YouTube Downloader Pro (python install/exe)
                    https://github.com/yt-dlp/yt-dlp
                
                
                montage.exe (part of ImageMagick - https://imagemagick.org/script/montage.php )
                    Required after yt-dlp downloads the video. This creates 4 images to be associated with music video
                    Place the exe into /bin folder

                
                STILL TO DO:
                    🞂 Music videos with a single quote arent unhighlighting (only when clicking on the list item itself - the check box is fine)
                    🞂 Highlight by genre currently doesnt highlight the image views
                    🞂 vars.UI.highlightMVImage isnt used anywhere. Can this be removed or was it to replace something?
    */
    DEBUG: true,
    appID: 'mvp',
    version: `1.99.18`,

    videoFolder: './assets/musicVideos',

    musicHTML: '',

    init: ()=> {
        vars.localStorage.init();

        
        let fV = vars.files;
        fV.listLoadCount++;

        fV.getFiles('getFiles.php',fV.dealWithResponseFromGetFiles);
        fV.getAllLyrics();
        fV.getMusic();
        
        let gID = vars.UI.getElementByID;
        gID('version').innerHTML = `v${vars.version}`;
        
        let video = gID('video');
        video.addEventListener('click', vars.App.video.pauseSwitch);
        video.addEventListener('dblclick', vars.App.fullScreenVideo);

        vars.App.initScrollingLyricsDivAndButton();
        
        // set up the floating genres container
        vars.UI.initFloatingGenres();
    },

    files: {
        endpoint: 'endpoints/',
        filteredForSearch: [],
        listLoadCount: 0,
        missingImages: [],
        musicVideoArray: [],
        overwriteLyrics: false,

        dealWithGetAllMusic: (rs)=> {
            vars.UI.hideLoadingScreen();

            let mL = JSON.parse(rs);
            if (mL['ERROR']) {
                if (mL['ERROR']==='No Music') {
                    console.warn(`Music folder wasnt found.\nThis is just a warning.\nIf theres a real error it will force a pop up`);
                    return;
                }
                vars.UI.showWarningPopUp(true, mL['ERROR']);
                return;
            };
            
            // everything looks good... at least 1 files was found
            let results = mL['music'];
            let dirTree = [];
            vars.DEBUG && console.groupCollapsed(`%cDealing with the MUSIC response`,'color: #00A3D9');
            results.forEach((t)=> {
                vars.DEBUG && console.log(t);
                if (!t.length) return;

                if (checkType(t, 'array')) {
                    t.forEach((f)=> {
                        f = f.split('\\');
                        // get the song name and folder
                        let songName = f.pop();
                        let folder = f.join('\\');
                        let index = dirTree.findIndex(d=>d.folder===folder);
                        if (index===-1) {
                            dirTree.push({ folder: folder, tracks: []});
                            index = dirTree.length-1;
                        };
                        
                        // push the track
                        dirTree[index].tracks.push(songName);
                    });
                } else if (checkType(t,'string')) {
                    t = t.split('\\');
                    // get the song name and folder
                    let songName = t.pop();
                    let folder = t.join('\\');
                    let index = dirTree.findIndex(d=>d.folder===folder);
                    if (index===-1) {
                        dirTree.push({ folder: folder, tracks: []});
                        index = dirTree.length-1;
                    };
                    
                    // push the track
                    dirTree[index].tracks.push(songName);
                };
            });
            vars.DEBUG && console.groupEnd();

            vars.App.musicList = dirTree;

            vars.UI.buildMusicList();
        },

        dealWithResponseFromGetAllLyrics: (rs)=> {
            vars.App.lyricsArray = JSON.parse(rs);

            // make sure the lyrics were sent back properly
            let l = vars.App.lyricsArray.filter(l=>l.lyrics);
            if (!l.length) { vars.UI.showWarningPopUp(true, `No lyrics found. Make sure WAMP is running on the gateway`) };
        },
        dealWithResponseFromGetFiles: (rs)=> {
            let UI = vars.UI;
            UI.hideLoadingScreen();
            
            let aV = vars.App;
            let fV = vars.files;

            let requestGenerateImages = false;

            fV.musicVideoArray = [];
            fV.musicVideoObject = JSON.parse(rs);
            fV.filteredForSearch = [];
            let noImagesArray = [];
            let genresList = aV.genres;
            // START PARSING THE RESPONSE FROM THE ENDPOINT
            vars.DEBUG && console.groupCollapsed(`%cFile RS. Building text and image lists.`,'color: #30ff30');
            fV.musicVideoObject.forEach((item)=> {
                fV.musicVideoArray.push(item.mvName);
                // add the shas to the genres associated with mvFile
                item.genres.forEach((_i)=> {
                    genresList[_i].push(item.sha256);
                });
                fV.filteredForSearch.push([item.mvName.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace('.mp4','').replaceAll('.webm','').replaceAll(/[^0-9a-z-A-Z ]/g, ""), item.sha256]);
                if (!item.hasImages) {
                    !requestGenerateImages && (requestGenerateImages=true);
                    noImagesArray.push(item.mvName);
                } else {
                    vars.App.getMVImage(item.mvName);
                };
            });
            if (requestGenerateImages) {
                vars.DEBUG && console.log(`At least one music video is missing its image set. Requesting the generator to do its thing.`);
                fV.missingImages = noImagesArray;
                fV.generateMusicVideoImages();
            };
            vars.DEBUG && console.groupEnd();
            
            UI.init();
            
        },
        dealWithResponseFromImageGenerator: (rs)=> {
            rs = JSON.parse(rs);

            if (!rs.length) return 'ERROR: Image generater response was empty!';
            
            let fails=[];

            let fV = vars.files;
            let missingImages = fV.missingImages;
            rs.forEach((item)=> {
                if (item.failed) {
                    fails.push(item);
                } else if (item.allImage.extrude==='failed') {
                    let msg = 'Extrusion FAILED!';
                    console.error(msg);
                    vars.UI.addMessageToYTLog(msg, '#ff3030');
                } else {
                    let index = missingImages.findIndex(m=>m===item.filename);
                    if (index>-1) { // index is valid
                        missingImages.splice(index,1); // remove the file from the missing array
                        vars.App.getMVImage(item.filename); // add the image to the images div

                        let msg = 'Extrusion Successful!';
                        vars.UI.addMessageToYTLog(msg, '#30ff30');
                    };
                };
            });

            if (missingImages.length) {
                let msg = 'Some music videos errored when attempting to generate their image sheet';
                console.warn(`${msg}\n`, missingImages);
                vars.UI.addMessageToYTLog(msg, '#ff3030');
            };
        },
        dealWithOptionsUpdate: (rs)=> {
            rs = JSON.parse(rs);
            if (rs.ERROR) { console.error(rs.ERROR); };
        },
        dealWithSaveGenreResponse: (rs)=> {
            rs = JSON.parse(rs);
            if (rs.valid) return;

            console.error(rs.ERROR);
            debugger;
        },
        dealWithSendLyricsResponse: (rs)=> {
            rs = JSON.parse(rs);
            if (rs.ERROR) {
                console.error(rs.ERROR);
                if (rs.ERROR.includes('add the overwrite var')) {
                    vars.UI.showWarningPopUp(true, 'Lyrics already exist!<br/>Right click on the UPLOAD button to reupload and overwrite.');
                };
                return;
            };

            // if we get here, everything was good, reload the lyrics
            vars.DEBUG && console.log(`Lyrics were updated successfully.`);
            vars.files.getAllLyrics();
        },
        dealWithYTGet: (rs)=> {
            rs = JSON.parse(rs);
            let msg='';
            let colour = '#30ff30';
            if (rs['ERROR'] || rs['WARNING']) {
                if (rs['ERROR']) {
                    msg += `ERROR: ${rs['ERROR']}`;
                    colour = '#ff3030';
                } else {
                    msg += `WARNING: ${rs['WARNING']}`;
                    colour = '#ff8030';
                };
            } else {
                msg += 'Download successful.<br/>Images will be generated in the background.';
                msg += rs['ytRequest'].join('<br/>');
                msg += rs['ytResponse'];

                // request getFiles, which in turn will generate the image spritesheet and config file
                let fV = vars.files;
                fV.getFiles('getFiles.php',fV.dealWithResponseFromGetFiles);
            };
            //console.log(html);
            vars.UI.addMessageToYTLog(msg, colour);
        },
        generateMusicVideoImages: ()=> {
            // as this endpoint generates ALL missing image files.
            // Theres no need to repeatedly request the endpoint
            // NOTE: 
            //      This can take some time depending on your CPU, so Id advise increasing the php page 
            //      timeout (max_execution_time) to account for the script probably taking more than the default 30s
            //      On my slowest PC (core i3) it takes around 3 or 4 seconds to generate a finished image sheet
            let fV = vars.files;
            fV.getFiles('generateVideoImages.php', fV.dealWithResponseFromImageGenerator);
        },

        getAllLyrics: ()=> {
            let fV = vars.files;

            let url = 'getAllLyrics.php';
            let callback = fV.dealWithResponseFromGetAllLyrics;
            fV.getFiles(url, callback);
        },

        getFiles: (url,callback)=> {
            url = vars.files.endpoint + url;
            let xmlHttp = new XMLHttpRequest();
            xmlHttp.onreadystatechange = function() { 
                if (xmlHttp.readyState == 4 && xmlHttp.status == 200) {
                    callback(xmlHttp.responseText);
                };
            };
            xmlHttp.open("GET", url, true); // true for asynchronous 
            xmlHttp.send(null);
        },

        getFilesPOST: (url, post, callback)=> {
            url = vars.files.endpoint + url;
            let xmlHttp = new XMLHttpRequest();
            xmlHttp.onreadystatechange = function() { 
                if (xmlHttp.readyState == 4 && xmlHttp.status == 200) {
                    callback(xmlHttp.responseText);
                };
            };
            xmlHttp.open("POST", url, true); // true for asynchronous 
            xmlHttp.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
            xmlHttp.send(post);
        },

        getMusic: ()=> {
            let fV = vars.files;

            fV.listLoadCount++;

            let url = 'getAllMusic.php';
            let callback = fV.dealWithGetAllMusic;

            fV.getFiles(url,callback);
        },

        getMVNameAndExtension: (sha)=> {
            if (!sha || sha.length!==64) return false;

            let mvO = vars.files.musicVideoObject;
            let data = mvO.find(m=>m.sha256===sha);

            let rs;
            if (data) {
                let mvArray = data.mvName.split('.');
                let mvExt = mvArray.pop();
                let mvName = mvArray.join('.');
                rs = { mvName: mvName, mvExt: mvExt };
            } else {
                rs = null;
            };

            return rs;
        },
        getShaForMusicVideo: (mv)=> {
            if (!mv.endsWith('.mp4') && !mv.endsWith('.webm')) {
                console.error(`The music video name must include its extension.\n  You requested the sha for "${mv}"`);
                return;
            };

            let fV = vars.files;
            let found = fV.musicVideoObject.find(m=>m.mvName===mv);
            if (!found) { console.error(`Unable to find sha for ${mv}!\nExiting`); return null; };

            return found.sha256;
        },

        getYT: (id)=> {
            if (id.length!==11) return false;

            let endpoint = 'downloadYT.php';
            let post = `id=${id}`
            let callback = vars.files.dealWithYTGet;

            // update the views by requesting the updated list
            vars.files.getFilesPOST(endpoint,post,callback);
        },

        removeMusicVideoFromList: (mvName)=> {
            let fV = vars.files;
            // find it in the main list
            let index = fV.musicVideoArray.findIndex(m=>m.includes(mvName));
            // and remove it (if found)
            index>-1 && fV.musicVideoArray.splice(index,1);

            return index>-1 ? true : false;
        },

        saveGenre: (sha,genre)=> {
            if (!sha || sha.length!==64 || !genre) return 'Invalid sha!';
            
            let fV = vars.files;
            let url = 'saveGenre.php';
            let post = `sha=${sha}&genre=${genre}`;

            fV.getFilesPOST(url, post, fV.dealWithSaveGenreResponse);
        },

        sendLyricsToServer: (force=false)=> {
            let fV = vars.files;
            
            let lyrics = vars.UI.getElementByID('lyrics').value;
            if (!lyrics.trim().length) return `Lyrics text area is empty!`;
            
            let options = vars.App.video.currentMusicVideoOptions;
            let sha = options.sha256;
            let savedLyrics = vars.App.findLyricsBySha(sha);

            if (savedLyrics && savedLyrics.lyrics===lyrics) {
                console.warn('Lyrics havent changed!')
                return;
            };

            let post = `sha=${sha}&lyrics=${encodeURIComponent(lyrics)}`;
            force && (post+=`&overwrite=true`);

            let url = 'uploadLyrics.php';
            // send the lyrics to the server and wait for response
            fV.getFilesPOST(url, post, fV.dealWithSendLyricsResponse);
        },

        updateOptions: (which,option,sha)=> {
            let allowed = ['introEnd','outroStart','lyrics'];
            if (!option || !checkType(which,'string') || sha.length!==64) return false;

            if (!allowed.includes(which)) {
                console.error(`Invalid which var (${which})`);
                return false;
            };

            let options = { sha: sha };
            options[which] = option;
            let params = `which=${which}&sha=${sha}&value=${option}`
            
            let callback = vars.files.dealWithOptionsUpdate;
            let url = `${vars.files.endpoint}setOptionsForMusicVideo.php`;

            let xmlHttp = new XMLHttpRequest();
            xmlHttp.onreadystatechange = function() { 
                if (xmlHttp.readyState == 4 && xmlHttp.status == 200) {
                    callback(xmlHttp.responseText);
                };
            };
            xmlHttp.open("POST", url, true); // true for asynchronous 
            xmlHttp.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
            xmlHttp.send(params);
        }
    },

    localStorage: {
        appID: ()=> {
            return vars.appID;
        },
        init: (reset=false)=> {
            let lV = vars.localStorage;
            let appID = lV.appID();
            let lS = window.localStorage;
            // LOAD THE VARIABLES
            if (!lS[appID] || reset) {
                lS[appID] = JSON.stringify({
                    ignore: [],
                    played: [],
                    stars: []
                });
            };
            let options = vars.App.options = JSON.parse(lS[appID]);

            // set up the recent var
            if (!lS[`${appID}_recent`] || reset) { lS[`${appID}_recent`] = 'video'; };
            vars.App.recent = lS[`${appID}_recent`];

            // set up the autoplay var for music player
            if (!lS[`${appID}_autoplay`] || reset) { lS[`${appID}_autoplay`] = 'true'; };
            vars.App.autoplayAudioTracks = lS[`${appID}_autoplay`] == 'true' ? true : false;

            // check for the new offsets array ADDED D20230616T1941
            if (!options['offsets']) {
                options.offsets = [];
                lS[appID] = JSON.stringify(options);
            };
        },
        saveAutoplay: ()=> {
            let lV = vars.localStorage;
            let appID = lV.appID();
            let lS = window.localStorage;
            lS[`${appID}_autoplay`] = vars.App.autoplayAudioTracks;
        },
        saveMVImageOffset: (sha,offset)=> {
            if (!sha || !checkType(offset,'string')) return false;

            let options = vars.App.options;
            let index = options.offsets.findIndex(m=>m[0]===sha);

            if (index<0) { // this music video doesnt have a preferred image yet (ie its offsetx===0)
                options.offsets.push([sha,offset]);
            } else {
                options.offsets[index] = [sha,offset];
            };

            let lV = vars.localStorage;
            let appID = lV.appID();
            let lS = window.localStorage;
            lS[appID] = JSON.stringify(options);
        },
        saveOptions: ()=> {
            let aV = vars.App;
            let json = JSON.stringify(aV.options);

            let lV = vars.localStorage;
            let lS = window.localStorage;
            lS[lV.appID()] = json;

            console.log(`%c** Options saved **`,'color: #30ff30; font-weight: bold;');
        },
        saveDefaultView: ()=> {
            let lV = vars.localStorage;
            let lS = window.localStorage;
            lS[`${lV.appID()}_recent`] = vars.App.recent;
        }
    },

    // APP
    App: {
        floatingButtonsVisible: false,
        genres: {
            blues: [],
            comedy: [],
            dance: [],
            dubstep: [],
            electronic: [],
            folk: [],
            grunge: [],
            hiphop: [],
            indie: [],
            industrial: [],
            metal: [],
            misc: [],
            pop: [],
            punk: [],
            rap: [],
            remix: [],
            rock: [],
            techno: []
        },
        linkArray: [],
        lyricsArray: [],
        musicList: [],
        musicPlayList: [],
        selectedMusicVideos: [],
        selectedGenres: [],
        showingSelectByGenre: false,
        shuffling: false,
        tableColumns: null,
        unselectedRandomise: false,

        // ENTRY FUNCTION
        init: ()=> {
            // pre-inits
            vars.App.video.init();

            // inits
            vars.init();
        },

        initScrollingLyricsDivAndButton: ()=> {
            let gID = vars.UI.getElementByID;

            let sSLB = gID('lyricsScrollerShowButton');
            let lS = gID('lyricsScroller');
            sSLB.onclick = ()=> {
                lS.show();
            };
            sSLB.onmouseenter = ()=> {
                sSLB.style.opacity=1;
            };
            sSLB.onmouseleave = ()=> {
                sSLB.style.opacity=0.33;
            };
        },

        addMusicVideosToIgnoreList: ()=> {
            let aV = vars.App;
            let options = aV.options;

            while (aV.selectedMusicVideos.length) {
                // add the music video to the ignore list
                let remove = aV.selectedMusicVideos.shift();
                let mvName = `${remove[0]}.${remove[1]}`;
                options.ignore.push(mvName);
                // find it in the main list and remove
                if (!vars.files.removeMusicVideoFromList(mvName)) {
                    console.error(`Index for ${mV} wasnt found`);
                };
            };

            // save the options to local storage
            vars.localStorage.saveOptions();

            // redraw the list
            vars.UI.buildList();

            // hide the popup
            vars.UI.showDeletePopUp(false);
        },

        addRemoveMV: (mv,ext)=> {
            let aV = vars.App;

            // does the video already exist in the selectedMusicVideos array?
            let index = aV.selectedMusicVideos.findIndex(m=>m[0]===mv); //.replaceAll('\'',"\\'")
            if (index===-1) { // no, it doesnt... ADD it
                aV.selectedMusicVideos.push([mv,ext]);
                vars.DEBUG && console.log(`Added %c${mv}%c to selected videos list`, 'color: #60ff60','color: default');
                return 'added';
            };

            // this mv exists in the selected list, remove it
            aV.selectedMusicVideos.splice(index,1);
            vars.DEBUG && console.log(`Removed`);

            return 'removed';
        },

        filterList: ()=> {
            let sL = vars.UI.getElementByID('searchList');
            let searchFor = sL.value;
            if (!searchFor.trim()) { // search box is empty, show everything!
                let children = vars.UI.getElementByID('list').children;
                for (let c=0; c<children.length; c++) { children[c].className = 'li'; };
                return;
            };
            
            let mVA = vars.files.filteredForSearch;
            let foundList = mVA.filter(m=>m[0].includes(searchFor));
            
            let filterArray = [];
            // all we need from the found list is the sha
            foundList.forEach((fL)=> {
                filterArray.push(fL[1]);
            });

            let children = vars.UI.getElementByID('list').children;
            for (let c=0; c<children.length; c++) {
                let child = children[c];
                let sha = child.getAttribute('data-sha');
                child.className = filterArray.includes(sha) ? 'li' : 'hidden';
            };
        },

        findLyricsBySha: (sha)=> {
            return vars.App.lyricsArray.find(m=>m.sha===sha) || null;
        },

        fullScreenVideo: ()=> {
            let aV = vars.App.video;
            let currentlyFullScreen = aV.fullScreen;
            
            let gID = vars.UI.getElementByID;
            let video = gID('video');
            
            if (currentlyFullScreen) {
                video.classList = '';
                aV.fullScreen = false;
                aV.hideLyricsScrollerAndButton(true);
                return;
            };

            video.classList = 'video_fullScreen';
            aV.fullScreen = true;

            // check for lyrics
            let lyrics = aV.currentMusicVideoOptions.lyrics;
            let show = lyrics ? true : false;
            aV.hideLyricsScrollerAndButton(!show);

        },

        generateDeselectByGenre: (genre)=> {
            if (!genre) return "No genre passed!";

            let aV = vars.App;
            let genreSet = aV.genres[genre];
            let sMV = aV.selectedMusicVideos;
            genreSet.forEach((sha)=>{
                let mv = vars.files.getMVNameAndExtension(sha); // get the video name
                let mvName = mv.mvName;
                let index = sMV.findIndex(m=>m[0]===mvName); // find the index in sMV
                index>-1 && sMV.splice(index,1); // remove it
            });

            // request the build list
            vars.UI.buildList();
        },

        genreClick: (e,div)=> {
            let genre = div.id.split('_')[1];

            let highlighted = div.className.includes('highlight');
            let adding = true;
            if (!highlighted) { // highlight the genre
                div.className = 'genre highlight';
            } else { // unhighlight
                div.className = 'genre';
                adding=false;
            };

            // is this the floating genres?
            let aV = vars.App;
            if (aV.showingSelectByGenre) {
                if (adding) {
                    // add this genre to the selectedByGenre array
                    aV.selectedGenres.push(genre);
                    // now tick the videos of the selected genre
                    aV.video.generatePlaylistByGenre(genre);
                } else {
                    // remove this genre to the selectedByGenre array
                    let index = aV.selectedGenres.findIndex(m=>m===genre);
                    aV.selectedGenres.splice(index,1);
                    //  now untick the files related to this genre
                    vars.App.generateDeselectByGenre(genre);
                };
                return;
            };


            // no its related to a music video
            // get the genres for this video by sha
            let sha = vars.UI.currentlyOver;
            let mvO = vars.files.musicVideoObject.find(m=>m.sha256===sha);
            let genres = mvO.genres;
            // add/remove genre from array
            if (adding) {
                genres.push(genre);
            } else {
                let index = genres.findIndex(m=>m===genre);
                genres.splice(index,1);
            };

            // update the genres list for this sha
            let option = vars.UI.getElementByID(`option_${sha}`);
            let gL = option.parentElement.getElementsByClassName('genreList');
            gL.length && (gL[0].innerHTML = genres.join(', '));

            // call endpoint to add/remove genre
            vars.files.saveGenre(sha,genre);
        },

        getMVExtension: (mv)=> {
            let extension = mv.split('.');
            return extension[extension.length-1];
        },

        getMVImage: (mvName, returnHTML=false)=> { // COMPLETE MISNOMER NOW; This used to pass an image to a div. Now, it generates the mv images div (one by one - ie its called over and over as the list is being built)
            if (!mvName) { console.warn(`mvName was either not sent or was invalid (mvName: ${mvName})`); return; };

            let sha = vars.files.getShaForMusicVideo(mvName);
            let nameOfMV = vars.App.getMVName(mvName);
            let mviDiv = vars.UI.getElementByID('musicVideoImages');

            let offset = vars.App.options.offsets.find(m=>m[0]===sha);
            let imageNumber = offset ? offset[1].split(' ')[0].replace('px','')*-1/320+1 : 0;
            (offset && vars.DEBUG) && console.log(`  Offset found for %c${nameOfMV}: %c${offset[1]} (image number ${imageNumber})`,'color: #ffff00','color: #00ff00');
            let style = !offset ? "" : `"object-position: ${offset[1]}"`;

            let html = `<div id="${sha}" onmouseenter="vars.UI.moveMVNextImageButton(event, this)" class="flex-image" onclick="vars.input.click(event,this)"><img class="images-for-videos" ${style&&(`style=${style}`)} src="assets/mvimages/${sha}/all_extrude.jpg"><div class="images-mvName">${nameOfMV}</div></div>`;

            if (returnHTML) return html;
            mviDiv.innerHTML += html;
        },
        getMVName: (mv)=> {
            return mv.replace('.mp4','').replace('.webm','');
        },

        getNextVideo: (leaveInArray=true)=> {
            let aV = vars.App;
            let rs = !aV.selectedMusicVideos.length ? null : leaveInArray ? aV.selectedMusicVideos[0] : aV.selectedMusicVideos.shift();
            return rs;
        },

        getOptionsForMusicVideo: (mvName)=> {
            let mVO = vars.files.musicVideoObject;

            let options = mVO.find(m=>m.mvName===mvName);

            if (!options || !options.options) {
                console.warn(`There are no options for the music video ${mvName}.\nYou should never see this message.\nIf you do, the %cgetFiles.php%c isnt working properly`,'font-size: 12px; font-weight:bold; color: #ffff00;','color: default');
                return false;
            };

            options.options.sha256 = options.sha256;
            return options.options;
        },

        removeSongFromNextList: (mvName)=> {
            let selected = vars.App.selectedMusicVideos;
            let i = selected.findIndex(m=>m[0]===mvName);
            if (i<0) {
                console.error(`Unable to find ${mvName} in selected music video array.\nReturning false.`);
                debugger;
                return false;
            };

            // remove the requested song
            selected.splice(i,1);
            // grab the currently playing and put it back into the array
            let sha = vars.App.video.currentMusicVideoOptions.sha256;
            let currentlyPlaying = vars.files.getMVNameAndExtension(sha);
            selected.splice(0,0,[currentlyPlaying.mvName,currentlyPlaying.mvExt]);
            // Update the UI
            vars.UI.updateTheComingUpList();
            // Remove currently playing again :)
            selected.shift();
        },

        searchForLyrics: ()=> {
            let options = vars.App.video.currentMusicVideoOptions;
            if (!options) return;

            if (options.sha256) {
                let mv = vars.files.getMVNameAndExtension(options.sha256);
                let searchString = `${mv.mvName} lyrics`;
                window.open(`https://www.google.com/search?q=${searchString}`);
            };
        },

        showNextMVImage: (event,divDOM)=> {
            let sha = divDOM.getAttribute('data-sha');
            let maxScroll = -960;
            let deltaScroll = 320;
            let divs = vars.UI.getElementByID(sha);
            if (!divs) return;
        
            let div = divs.children[0];
            let oP = div.style.objectPosition
        
            let offset='';
            if (!oP) { // this ISNT the first time weve modified the object position: pdate it.
                offset = "-320px 0px";
            } else {
                let offsetX = div.style.objectPosition.split(" ")[0].replace("px","")*1;
                offsetX = (offsetX>maxScroll) ? offsetX-deltaScroll : 0;
                offset = `${offsetX}px 0px`;
            };
            
            div.style.objectPosition=offset;

            vars.localStorage.saveMVImageOffset(sha,offset);
        },

        shuffleMusicVideos: ()=> {
            let aV = vars.App;
            if (aV.shuffling) return;
            aV.shuffling=true;

            vars.DEBUG && console.log(`Shuffle started...`);
            let fV = vars.files;
            let completeList = [...fV.musicVideoArray];

            // First. If we have selected videos, remove them from the file list
            let sV = [];
            if (aV.selectedMusicVideos.length) {
                aV.selectedMusicVideos.forEach((sMV)=> {
                    sV.push(`${sMV[0]}.${sMV[1]}`);
                });
            } else {
                aV.unselectedRandomise=true;
            };
            sV.forEach((sMV)=> {
                let idx = completeList.findIndex(m=>m===sMV);
                idx>-1 && completeList.splice(idx,1);
            });

            // now shuffle both arrays
            shuffle(sV);
            shuffle(completeList);
            // join them back together again
            fV.musicVideoArray = [...sV,...completeList];

            // RE-ORDER ALL THE VIEWS
            vars.UI.buildList(); // also builds the table and image views

            // reset the shuffling var
            setTimeout(()=> {
                vars.input.enableShuffleButton();
            },100);
            vars.DEBUG && console.log(`... shuffle rebuild completed!`);
        },

        update: ()=> {
            // CHECK IF VIDEO IS PLAYING
            let UI = vars.UI;
            let video = UI.getElementByID('video');

            let videoPlaying = !video.paused;
            if (videoPlaying) { // video is currently playing
                let vAV = vars.App.video;
                if (vAV.currentMusicVideoOptions.outroStart) {
                    if (video.currentTime>vAV.currentMusicVideoOptions.outroStart) {
                        vAV.playNext();
                        return;
                    };
                };

                // update the scroll position of the lyrics if necessary
                if (UI.scrollLyrics && UI.scrollTotalDistance) {
                    UI.scrollLyricsTextArea();
                };
            };
            // END


            // CHECK IF FLOATING PLAY BUTTONS SHOULD BE VISIBLE
            if (window.scrollY>=307) {
                vars.UI.showFloatingButtons(true);
            } else {
                vars.UI.showFloatingButtons(false);
            };
            // END
        },

        updateTableColumns: (init=false)=> {
            let aV = vars.App;

            if (window.innerWidth<800) {
                if (aV.tableColumns===1) return;
                aV.tableColumns=1;
            } else if (window.innerWidth>=1500) {
                if (aV.tableColumns===3) return;
                aV.tableColumns=3;
            } else {
                if (aV.tableColumns===2) return;
                aV.tableColumns=2;
            };
            vars.DEBUG && console.log(`${aV.tableColumns} column table`);
            vars.DEBUG && console.log(`Change in column count detected. Redrawing the mv table`);

            vars.UI.setTableColumns();

            !init && vars.UI.buildTable();
        },

        updateTheComingUpList: ()=> {
            vars.UI.updateTheComingUpList();
        },

        video: {
            currentMusicVideoOptions: null,
            interval: null,
            loading: false,
            playlist: null,
            fullScreen: false,

            init: ()=> {
                var v = vars.UI.getElementByID('video');
                var vV = vars.App.video;

                vV.interval = setInterval(()=> {
                    vars.App.update();
                }, 250);

                v.oncanplay = ()=> {
                    if (!vV.loading) return;

                    vV.loading=false;
                    vars.DEBUG && console.log(`Music video loaded. Init Scroll Lyrics and skipping intro (if any)`);
                    vV.scrollLyricsInit();

                    let options = vV.currentMusicVideoOptions;
                    // check for fullscreen
                    if (document.fullscreenElement && document.fullscreenElement.id==='video') { // show the title pop up for the new music video
                        // TODO This no longer works.. was only valid up to ~ Chrome 91.0
                        // unfortunately it means using the fullscreen API - thats a big change!
                        // an example can be seen here: https://dev.to/aws/html-video-with-fullscreen-chat-overlay-4jfl
                        vars.UI.showCurrentlyPlayingPopUp(true,vV.currentMusicVideoOptions.title);
                    };

                    if (!options.introEnd) return;

                    // skip to the intro end position
                    v.currentTime = options.introEnd;
                };
            },

            generateOverrideImage: ()=> {
                //draw( video, thecanvas, img ){
 
                // get the canvas context for drawing
                var context = thecanvas.getContext('2d');
            
                // draw the video contents into the canvas x, y, width, height
                        context.drawImage( video, 0, 0, thecanvas.width, thecanvas.height);
            
                // get the image data from the canvas object
                        var dataURL = thecanvas.toDataURL();
            
                // set the source of the img tag
                img.setAttribute('src', dataURL);

            },

            generatePlaylist: ()=> {
                let playlist = [];

                vars.files.musicVideoArray.forEach((mVI)=> {
                    let mvArray = mVI.split('.');
                    let extension = mvArray.pop();
                    let mvName = mvArray.join('.');
                    playlist.push([mvName,extension]);
                });

                vars.App.selectedMusicVideos = playlist;
            },

            generatePlaylistByGenre: (genre)=> {
                if (!genre) return;
            
                let genres = vars.App.genres;
                let shaList = genres[genre];

                let aV = vars.App;
                let mvList = [];
                shaList.forEach((sha)=> {
                    let mv = vars.files.getMVNameAndExtension(sha);
                    if (aV.selectedMusicVideos.findIndex(m=>m[0]===mv.mvName)>-1) return;
                    mvList.push([mv.mvName, mv.mvExt]);
                });
    
                aV.selectedMusicVideos = [...aV.selectedMusicVideos,...mvList];
                
                vars.UI.buildList();
            },

            getVideoDiv: ()=> {
                return vars.UI.getElementByID('video');
            },

            getYT: (e,input)=> {
                if (e.keyCode!==13) return;

                let url = input.value;
                let ytIDLength = 11;
                
                let allowed = ['https://youtu.be/','https://www.youtube.com/'];
                let found = false;
                // check for a valid url whilst removing common url parts (in allowed array above)
                allowed.forEach((a)=> {
                    (url.startsWith(a) && !found) && (found=true);
                    url = url.replace(a,'');
                });
                url = url.replace('watch?v=','');
                if (!found) { console.error(`%cURL was invalid.\nIt must be in its original format starting with:\n%c    https://youtu.be/\n    %cor\n    %chttps://www.youtube.com/%c\nExamples:\n    %chttps://www.youtube.com/watch?v=wYkmvq_vANs\n    https://www.youtube.com/watch?v=wYkmvq_vANs&t=120\n    https://www.youtube.com/watch?v=8ifY2dvQnK4&list=PLAAetX470-WjEnvqIrmN_1AusoXtJAUoe&index=1\n  %cor\n    https://youtu.be/8ifY2dvQnK4\n    https://youtu.be/8ifY2dvQnK4?t=205`, 'color: #ff0000', 'color: default','color: #ffff00', 'color: default','color: #30ff30', 'color: default', 'color: #30FF30'); return false; }
                
                // url is valid
                // start parsing the URL
                if (url.length!==ytIDLength) { // we dont have the ID after removing the common part of the url
                    console.log(url);
                    url = url.split('&')[0];
                    url.includes('?t=') && (url=url.split('?')[0]);
                };

                // again, check if the url is 11 characters long
                if (url.length!==11) {
                    console.error(`The url couldnt be parsed.\nWhen looking for the videos ID, the function was left with ${url}`);
                    return false;
                };



                // YUP. Everything looks good. We have an id (url) that is 11 characters long. Basically its as valid as it gets
                // empty out the input box
                input.value='';

                // add a download msg to the log
                let msg = `Downloading youtube video with ID: ${url}<br/>Please wait...`;
                vars.UI.addMessageToYTLog(msg);

                // send URL to the endpoint
                vars.files.getYT(url);
            },

            hideLyricsScrollerAndButton: (hide=true)=> {
                let gID = vars.UI.getElementByID;
                let visible = hide ? 'hidden' : 'visible';
                gID('lyricsScrollerShowButton').style.visibility=visible;
                gID('lyricsScroller').style.visibility=visible;
            },

            introEndSet: ()=> {
                let which = 'introEnd';
                let vV = vars.App.video;
                let v = vV.getVideoDiv();

                let options = vV.currentMusicVideoOptions;
                if (options.outroStart) {
                    if (options.outroStart<options.introEnd || options.introEnd===options.outroStart) {
                        console.log(`introEnd %c${options.introEnd}%c cannot be after or equal to outroStart %c${options.outroStart}%c. %cRequest IGNORED%c.`, 'color: #30ff30', 'color: default;', 'color: #30ff30', 'color: default;', 'color: #e10000', 'color: default;');
                        return false;
                    };
                };
                if (options.introEnd===v.currentTime) {
                    console.log(`introEnd is already set to %c${v.currentTime}%c. %cRequest IGNORED%c.`, 'color: #30ff30', 'color: default;', 'color: #e10000', 'color: default;');
                    return;
                };

                options.introEnd = v.currentTime;

                let sha = options.sha256;
                vars.files.updateOptions(which,options.introEnd,sha);
            },

            outroStartSet: ()=> {
                let which = 'outroStart';
                let vV = vars.App.video;
                let v = vV.getVideoDiv();

                let options = vV.currentMusicVideoOptions;
                if (options.introEnd) {
                    if (options.introEnd<options.outroStart || options.introEnd===options.outroStart) {
                        console.log(`outroStart %c${options.outroStart}%c cannot be before or equal to introEnd %c${options.introEnd}%c. %cRequest IGNORED%c.`, 'color: #30ff30', 'color: default;', 'color: #30ff30', 'color: default;', 'color: #e10000', 'color: default;');
                        return false;
                    };
                };
                if (options.outroStart===v.currentTime) {
                    console.log(`outroStart is already set to %c${v.currentTime}%c. %cRequest IGNORED%c.`, 'color: #30ff30', 'color: default;', 'color: #e10000', 'color: default;');
                    return;
                };

                options.outroStart = v.currentTime;

                let sha = options.sha256;
                vars.files.updateOptions(which,options.outroStart,sha);
            },

            playNext: ()=> {
                let aV = vars.App;
                let gID = vars.UI.getElementByID;
                
                // draw the upcoming list
                aV.updateTheComingUpList();

                // get the next track details
                let nextMusicVideo = aV.getNextVideo();
                if (!checkType(nextMusicVideo,'array') || nextMusicVideo.length!==2) {
                    aV.video.show(false);
                    aV.video.hideLyricsScrollerAndButton(true);
                    console.log(`No videos left in selected...\nExiting.`);
                    return;
                };

                // next track is valid
                let nextMusicVideoTitle = nextMusicVideo[0];
                
                if (aV.video.getVideoDiv().className.includes('fullScreen')) { // currently full screen, show the currently playing pop up
                    // make sure the pop up isnt currently visible
                    let cPPU = vars.UI.getElementByID('currentlyPlayingPopUp');
                    if (cPPU.timeout) {
                        clearTimeout(cPPU.timeout);
                        delete(cPPU.timeout);
                    };
                    // show the pop up
                    vars.UI.showCurrentlyPlayingPopUp(true,nextMusicVideo[0]);
                };

                let mvFile = nextMusicVideo.join('.');
                // get the options for this file
                aV.video.currentMusicVideoOptions = aV.getOptionsForMusicVideo(mvFile);
                aV.video.currentMusicVideoOptions.title = nextMusicVideoTitle;

                // grab the lyrics (if any)
                let sha = aV.video.currentMusicVideoOptions.sha256;
                let lO = aV.findLyricsBySha(sha);
                aV.video.currentMusicVideoOptions.lyrics = lO ? lO.lyrics : '';
                // update the 2 lyrics containers (adds lyrics or empties if there are none)
                gID('lyrics').value = lO ? lO.lyrics : '';
                let lS = gID('lyricsScroller');
                lS.innerHTML = lO ? `<pre>${lO.lyrics}</pre>` : '';
                if (lO) {
                    lS.style.right = `${0-lS.offsetWidth}px`;
                };
                // if lO and fullScreen, show the button else hide it
                let show = lO && aV.video.fullScreen ? true : false;
                aV.video.hideLyricsScrollerAndButton(!show);

                // unselect this music video
                vars.input.clickOnWhich('list',sha);

                // load and play the video
                aV.video.loading = true;
                let v = vars.UI.getElementByID('video');
                let folder = vars.videoFolder;
                v.src=`${folder}/${mvFile}`;
            },

            pauseSwitch: ()=> {
                let v = vars.UI.getElementByID('video');
                v.paused ? v.play() : v.pause();
            },

            scrollLyricsInit: ()=> {
                console.log(`%cScroll Lyrics Init`,'colour: #30FF30');
                let UI = vars.UI;
                let lyricsDiv = UI.getElementByID('lyrics');
                let divHeight = lyricsDiv.offsetHeight;
                let scrollHeight = lyricsDiv.scrollHeight;

                let scrollLyrics = UI.scrollLyrics = scrollHeight<=divHeight ? false : true;

                if (!scrollLyrics) { // lyrics dont exist
                    // empty the textarea & reset the vars
                    lyricsDiv.value='';
                    UI.scrollLyrics=false;
                    UI.scrollTotalDistance=0;
                    return;
                };

                let aVV = vars.App.video;
                let videoDiv = aVV.getVideoDiv();
                let videoLength = videoDiv.duration;
                aVV.currentMusicVideoOptions.videoLength = videoLength;

                UI.scrollTotalDistance = scrollHeight-divHeight;

                // set the new scrollers vars
                let lS = UI.getElementByID('lyricsScroller');
                
                let paddingY = lS.dataset.paddingy*1;
                let startHeight = lS.dataset.initialdivheight*1;
                let windowHeight = window.innerHeight;
                lS.dataset.windowheight = windowHeight;
                
                let startY = windowHeight-paddingY-startHeight;
                lS.dataset.starty = startY;
                divHeight = lS.offsetHeight;
                lS.dataset.divfullheight=divHeight;

                // resize the scroller div
                lS.style.top=`${startY}px`;
                lS.style.height=`${startHeight}px`;

            },

            show: (show=true)=> {
                let v = vars.UI.getElementByID('videoContainer');
                if (show) {
                    v.className = 'fade-in-flex';
                    v.style.zIndex=10;
                    v.style.top = `${window.scrollY}px`;
                    document.body.style.overflowY='hidden';
                    return;
                };

                // Hide the video container
                v.className='hidden';
                v.style.zIndex=-10;
                document.fullscreenElement && document.exitFullscreen();
                document.body.style.overflowY='scroll';
                

                vars.UI.getElementByID('video').pause();
            }
        }
    },

    input: {
        click: (e,div)=> {
            // figure out which view was clicked
            let id = div.id;

            let sha = '';
            let which = '';

            if (id.startsWith('checkbox')) {
                which='option'; sha = vars.App.linkArray.find(m=>m[0]===id)[3];
            } else if (id.startsWith('table_')) { // table selection was clicked
                which='table'; sha = id.split('_')[1];
            } else if (id.startsWith('list_')) { // table selection was clicked
                which='list'; sha = id.split('_')[1];
            } else if (id.length===64) { // sha alone (video images click)
                which='images'; sha = id;
            } else { // ummm... no table, option or list item was clicked.. wtf?
                console.error(`Something with an ID of ${id} was clicked but has no function to deal with it`);
                debugger;
                return;
            };
            /* REMOVED
                else if (id.startsWith('option_')) { // table selection was clicked
                    which='option'; sha = id.split('_')[1];
                }
            */

            vars.input.clickOnWhich(which,sha);
        },

        clickOnWhich: (which,sha)=> {
            if (!sha || sha.length!==64) return false; // sha is invalid: exit.
            /*
                This function deals with (un)highlighting the clicked "which" if necessary.
                It then (un)highlights the other views that are available.
                And example of each possibility:
                    image  clicked  -> click the option                                 -> click the table view
                    list   clicked  -> click the option     -> click the image view     -> click the table view
                    option clicked                          -> click the image view     -> click the table view
                    table  clicked  -> click the option     -> click the image view
            */

            let availableDivs = ['images','table']; // note that the "list" div is NOT in this array. Thats because it doesnt get highlighted in any way, no matter what was clicked
            which!=='option' && availableDivs.push('option');
            /*
                ******************************
                *  ADD OR REMOVE THE MUSIC   *
                * VIDEO TO THE SELECTED LIST *
                ******************************
            */
            let rs = vars.files.getMVNameAndExtension(sha);
            if (!rs) {
                console.error(`Unable to find mv name and extension for sha ${sha}.\nExiting`);
                debugger;
                return;
            };

            // add/remove music video to "selected" list
            let addRS = vars.App.addRemoveMV(rs.mvName,rs.mvExt);

            // did we just add or remove this music video from the selected list?
            let added = addRS==='added' ? true : false;
            let css = added ? 'color: #30ff30' : 'color: #ff3030';

            // now (un)highlight all the others
            let gID = vars.UI.getElementByID;
            availableDivs.forEach((aDiv)=> {
                switch (aDiv) {
                    case 'images': // highlight the associated image
                        let iDiv = gID(sha);
                        iDiv.className = added ? 'flex-image image-selected' : 'flex-image';
                        vars.DEBUG && console.log(`  > %c${added?'Highlighted':'Unhighlighted'} image.`, css);
                    break;

                    case 'option': // tick the associated option
                        let checkBoxID = vars.App.linkArray.find(m=>m[1]===rs.mvName);
                        if (!checkType(checkBoxID,'array') || checkBoxID.length!==4) {
                            console.error(`Unable to find the checkbox for ${mvName}`);
                            return false;
                        };

                        let checkBox = vars.UI.getElementByID(checkBoxID[0]);
                        checkBox.checked = added ? true : false;
                        vars.DEBUG && console.log(`  > %c${added?'Checked':'Unchecked'} tick box.`, css);
                    break;

                    case 'table': // highlight the associated table item
                        let tDiv = gID(`table_${sha}`);
                        tDiv.className = added ? 'list-item item-selected' : 'list-item';
                        vars.DEBUG && console.log(`  > %c${added?'Highlighted':'Unhighlighted'} table.`, css);
                    break;
                };
            });
        },

        enableShuffleButton: (enable=true)=> {
            let aV = vars.App;
            let gID = vars.UI.getElementByID;
            let div = gID('shuffleButton');
            let rndDiv = gID('randomiseFloating');
            if (enable) {
                div.style.opacity=1;
                rndDiv.style.opacity=1;
                aV.shuffling=false;
            } else {
                div.style.opacity=0.33;
                rndDiv.style.opacity=0.33;
            };
        },

        floatingPlayButtonClick: ()=> {
            let aV = vars.App;
            let vV = aV.video;

            if (!aV.selectedMusicVideos.length && !aV.unselectedRandomise) {
                vars.UI.shakeFloatingPlayButton();
                return;
            };
            
            if (!aV.selectedMusicVideos.length) {
                vars.App.video.generatePlaylist();
            };

            vV.show();
            vV.playNext();
        },

        playButtonClick: ()=> {
            vars.input.floatingPlayButtonClick();
        }

    },

    UI: {
        buildComplete: false,
        currentlyOver: '',
        currentView: 'list',
        intervals: {
            floatingPlayButton: null,
        },
        loadingScreenHideDelay: 2000, // delay in ms before hiding the loading screen (if loads are too fast the loading screen hardly shows)
        musicListClass: null,
        scrollLyrics: false,
        scrollTotalDistance: 0,
        viewNames: ['List', 'Table', 'Images (small)', 'Images (large)'],
        views: ['list','table','images-s','images-l'],

        init: ()=> {
            // start the loading screen
            vars.UI.loadingScreenStart();
            // remove hidden/deleted videos
            vars.App.options.ignore.forEach((mv)=> {
                vars.files.removeMusicVideoFromList(mv);
            });

            let gID = vars.UI.getElementByID;
            let lS = gID('lyricsScroller');
            lS.show = ()=> {
                lS.style.right =  lS.style.right === "0px" ? `-${lS.offsetWidth}px` : "0px";
            };

            lS.getYOffsetAndUpdate = (delta)=> {
                if (!delta) return;

                let paddingY = lS.dataset.paddingy*1; // unused at this point, just left here for reference
                let startY = lS.dataset.starty*1;
                let iDV = lS.dataset.initialdivheight*1;
                let divFullHeight = lS.dataset.divfullheight*1;

                let offsetY = startY - delta * (startY + divFullHeight - iDV);
                
                // now figure out the height of the div
                let height = startY-offsetY;
                //if (height>=divFullHeight) return;
                
                lS.style.top=`${offsetY}px`;
                lS.style.height=`${height}px`;
            };
            
            vars.App.updateTableColumns(true);

            vars.UI.buildList();
        },

        initFloatingGenres: ()=> {
            let fG = vars.UI.getElementByID('floatingGenres');
            let html = '';
            let genres = vars.App.genres;
            for (let _g in genres) {
                html += `<div id="genre_${_g}" class="genre" onclick="vars.App.genreClick(event,this)">${_g.capitalise()}</div>`;
            };
            fG.innerHTML = html;
        },

        addMessageToYTLog: (msg='', colour='#ffffff')=> {
            if (!msg.trim()) return;

            let divName = `ytlog-` + generateRandomID();

            let gID = vars.UI.getElementByID;
            let ytLog = gID('ytLog');
            let html = `<div id="${divName}" class="log-item" style="color: ${colour}">${msg}</div>`;
            ytLog.innerHTML = ytLog.innerHTML + html;
            // add a timer to this div to delete it after a few seconds
            let timeout = 5000;
            setTimeout(()=> {
                gID(divName).remove();
            }, timeout);
        },

        buildImagesView: ()=> {
            let tStart=0;
            if (vars.DEBUG) {
                console.groupCollapsed(`%cFile RS. Building text and image lists.`,'color: #30ff30');
                tStart = new Date();
            };
            let aV = vars.App;
            let sMV = aV.selectedMusicVideos;
            let rs = aV.linkArray;
            let mviDiv = vars.UI.getElementByID('musicVideoImages');
            mviDiv.innerHTML='';

            rs.forEach((mv)=> {
                let mvName = mv[1];
                let fileName = `${mv[1]}.${mv[2]}`;
                let html = aV.getMVImage(fileName, true); // add the image to the images div
                let cssClass = sMV.findIndex(m=>m[0]===mvName)===-1 ? 'flex-image' : 'flex-image image-selected';
                let divArray = html.split(' ');
                divArray.splice(1,0,cssClass);
                html = divArray.join(' ');
                mviDiv.innerHTML = mviDiv.innerHTML + html;
            });
            if (vars.DEBUG) {
                console.groupEnd();
                console.log(`Build Images took ${new Date()-tStart}ms`);
            };
        },

        buildList: ()=> {
            let aV = vars.App;
            let fV = vars.files;
            let UI = vars.UI;

            let rs = fV.musicVideoArray;

            let html = '';
            let listDOM = UI.getElementByID('list');

            let selected = aV.selectedMusicVideos;

            let id = 0;

            let linkArray = [];
            rs.forEach((mv)=> {
                let extension = aV.getMVExtension(mv);
                let mvName = aV.getMVName(mv);
                let sha = vars.files.getShaForMusicVideo(mv);
                let genres = vars.files.musicVideoObject.find(m=>m.sha256===sha).genres.join(', ');

                let checked = selected.findIndex(m=>m[0]===mvName)>-1 ? 'checked': '';

                html+=`<div data-sha="${sha}" class="li" onmouseenter="vars.UI.showGenreButton(event,this,true)" onmouseleave="vars.UI.showGenreButton(event,this,false)">`;
                html+=`<div id="option_${sha}" class="option_select"><input id="checkbox_${id}" type="checkbox" ${checked} onclick="vars.input.click(event,this);"></div>`;
                html+=`<div id="list_${sha}" class="listItem" onclick="vars.input.click(event,this)">${mvName}</div>`;
                html+=`<div class="genreList">${genres}</div>`;
                html+='<div class="genreButton hidden" onclick="vars.UI.showFloatingGenresContainer(event,this,true,false)">GENRE</div>';
                html+='</div>';

                linkArray.push([`checkbox_${id}`,mvName,extension,sha]);

                id++;
            });

            aV.linkArray = linkArray;

            listDOM.innerHTML = html;

            // build the table
            UI.buildTable();
            let mVI = UI.getElementByID('musicVideoImages');
            mVI.children && mVI.children.length ? UI.reorderImagesView() : UI.buildImagesView();
        },

        buildMusicList: ()=> {
            vars.UI.musicListClass = new AudioPlayer();
        },

        buildTable: ()=> {
            let tStart = new Date();
            let aV = vars.App;
            let gID = vars.UI.getElementByID;

            let columns = aV.tableColumns;
            let colDivs = [];
            for (let cD=0; cD<columns; cD++) {
                let c = gID(`tableColumn${cD}`);
                c.innerHTML='';
                colDivs.push(c);
            };

            let child = 0;
            let sMV = aV.selectedMusicVideos;
            let rs = aV.linkArray;
            rs.forEach((mv)=> {
                let col = child%columns;
                let mvName = mv[1];
                let sha = vars.files.getShaForMusicVideo(`${mv[1]}.${mv[2]}`);
                let cssClass = sMV.findIndex(m=>m[0]===mvName)===-1 ? 'list-item' : 'list-item item-selected';
                let html = `<div id="table_${sha}" class="${cssClass}" onclick="vars.input.click(event,this)">${mvName}</div>`;
                colDivs[col].innerHTML = colDivs[col].innerHTML + html;
                child++;
            });
            console.log(`Build Table took ${new Date()-tStart}ms`);

        },

        checkAll(check=true, invert=false) { // if invert is true, "check" is ignored        
            let UI = vars.UI;
            let lA = vars.App.linkArray;
            let gID = UI.getElementByID;

            let list = gID('list').children; 

            let files = [];
            for (let l in list) {
                if ((l*1).toString()!=='NaN') { 
                    let c = list[l].firstChild.firstChild;
                    if (!invert) { c.checked = check; } else { c.checked = !c.checked; };

                    let valid = lA.find(m=>m[0]===c.id) || null;
                    if (!valid) { continue; };
                    
                    let mvName= valid[1];
                    let extension = valid[2];
                    let sha = valid[3];

                    if (c.checked) {
                        files.push([mvName,extension]);
                        // highlight the other views
                        UI.getViewImageDiv(sha).className = 'flex-image image-selected';
                        UI.getViewTableDiv(sha).className = 'list-item item-selected';
                    } else { // unhighlight this on other views
                        UI.getViewImageDiv(sha).className = 'flex-image';
                        UI.getViewTableDiv(sha).className = 'list-item';
                    };
                };
            };
            vars.App.selectedMusicVideos = files;
        },
        checkInverse() {
            vars.UI.checkAll(null,true);
        },

        destroyLoadingScreen: (timeout=0)=> {
            setTimeout(()=> {
                let lS = vars.UI.getElementByID('loadingScreen');
                lS.remove();
            },timeout)
        },

        getElementByID(id) {
            if (!id) return false;

            return document.getElementById(id);
        },

        getViewImageDiv: (sha)=> {
            if (!sha || sha.length!==64) return;

            return vars.UI.getElementByID(sha);
        },
        getViewTableDiv: (sha)=> {
            if (!sha || sha.length!==64) return;

            return vars.UI.getElementByID(`table_${sha}`);
        },

        getWarningPopUp: ()=> {
            return vars.UI.getElementByID("warningPopUp");
        },

        hideLoadingScreen: ()=> {
            let fV = vars.files;
            fV.listLoadCount--;
            if (fV.listLoadCount) return;

            let delayMultiplier = 1.05;
            let alphaZeroDuration = 1000*delayMultiplier;

            if (vars.UI.loadingScreenHideDelay) {
                setTimeout(()=> {
                    vars.UI.getElementByID('loadingScreen').className='lSalphaZero';
                    vars.UI.destroyLoadingScreen(alphaZeroDuration);
                },vars.UI.loadingScreenHideDelay);
                return;
            };

            vars.UI.getElementByID('loadingScreen').className='lSalphaZero'; // lsAlpha transition duration is set in css (currently 1s)
            // so this function will delay for that long
            vars.UI.destroyLoadingScreen(alphaZeroDuration);
        },

        highlightGenres: (genres)=> {
            // first, unhighlight all genres
            vars.UI.unhighlightAllGenres();

            // start highlighting for this music video
            let gID = vars.UI.getElementByID;
            genres.forEach((g)=> {
                gID(`genre_${g}`).className = 'genre highlight';
            });
        },

        highlightMVImage: (e, div, direct=false)=> {
            div.className.includes('image-selected') ? div.className = 'flex-image' : div.className = 'flex-image image-selected';
            
            // find the checkbox in the list and tick/untick
            if (!direct) return;
            let found=false;
            let sha = div.id;
            let children = vars.UI.getElementByID('list').children;
            for (let c=0; c<children.length; c++) {
                if (!found && children[c].dataset.sha===sha) {
                    found=children[c];
                    let isChecked = found.childNodes[0].childNodes[0].checked;
                    found.childNodes[0].childNodes[0].checked=!isChecked;
                    let ob = vars.files.musicVideoObject.find(m=>m.sha256===sha);
                    if (!ob) {
                        console.error(`Unable to find mvName from sha (${sha})`);
                        return;
                    };
                    let mvName = ob.mvName;
                    let mvSplit = mvName.split('.');
                    let extension = mvSplit.pop()
                    mvName = mvSplit.join('.');

                    vars.App.addRemoveMV(mvName,extension,true);
                };
            };
        },

        loadingScreenStart: ()=> {
            let gID = vars.UI.getElementByID;

            gID('lSheading').className='lSslideUp';
            let lSV = gID('lSversion');
            lSV.innerHTML = `version: ${vars.version}`;
            lSV.className='lSslideUp lSversionSlideIn';
            gID('lSpleaseWait').className='';
            gID('lSego').className='lSslideDown';
        },

        moveMusicVideoImageBackIntoMVI: ()=> {
            let gID = vars.UI.getElementByID;
            let mvI = gID('imagesForVideo');
            if (!mvI.childElementCount) return;
        },
        moveMVNextImageButton: (e,div)=> {
            let divPosition = div.getBoundingClientRect();
            let sha = div.id;
            let divTop = divPosition.top;
            let divRight = divPosition.right;

            let divider = vars.UI.currentView==='images-s' ? 2 : 1;

            let nextImageButton = vars.UI.getElementByID('nextMusicVideoImage');
            nextImageButton.setAttribute('data-sha',sha);
            let y = (divTop+2)/divider+window.scrollY;
            divider===2 && (y-=17);
            nextImageButton.style.top=`${y}px`;
            nextImageButton.style.scale=1/divider;
            nextImageButton.style.left=`${(divRight-(64+5)*((1+divider)/2))/divider}px`;

            vars.UI.showChangeMVImageButton(true);
        },

        reorderImagesView: ()=> {
            let tStart = vars.DEBUG && new Date();

            let fV = vars.files;
            let completeList = [...fV.musicVideoArray]; // get the complete list
            let divs = vars.UI.getElementByID('musicVideoImages'); // grab the mVI div
            let children = [...divs.children]; // grab its children
            divs.innerHTML=''; // empty the div

            // go thru the complete list, adding the divs back in the correct order
            completeList.forEach((c)=> {
                let sha = vars.files.getShaForMusicVideo(c);
                let index = children.findIndex(m=>m.id===sha);
                if (index<0) return;
                let div = children.splice(index,1)[0];// remove it from the children
                divs.append(div); // push it back into the mvi div
            });

            vars.DEBUG && console.log(`Images View took ${new Date()-tStart}ms to reorder`);
        },

        scrollLyricsTextArea: ()=> {
            if (!vars.UI.scrollLyrics) return;

            let UI = vars.UI;
            let videoDiv = vars.App.video.getVideoDiv();
            let cT = videoDiv.currentTime;
            let tT = videoDiv.duration;

            let offsetMult = cT/tT;

            let textAreaScrollY = offsetMult * vars.UI.scrollTotalDistance;
            UI.getElementByID('lyrics').scroll(0,textAreaScrollY);

            UI.getElementByID('lyricsScroller').getYOffsetAndUpdate(offsetMult);

        },

        setTableColumns: ()=> {
            let tableDiv = vars.UI.getElementByID('table');
            let html = '';
            for (let tC=0; tC<vars.App.tableColumns; tC++) {
                html+=`<div id="tableColumn${tC}" class="column"></div>`;
            };
            tableDiv.innerHTML = html;
        },

        shakeFloatingPlayButton: ()=> {
            let pBF = vars.UI.getElementByID('playButtonFloating');
            let frames = 10;
            let frame = 0;
            let intervalNumber = setInterval(()=> {
                if (frame<frames) {
                    let className = frame%2 ? 'pBFLeft' : 'pBRight';
                    pBF.className = className;
                    frame++;
                    return;
                };

                pBF.className='';
                clearInterval(intervalNumber);
            },1000/30);
        },

        showDeletePopUp: (show=true)=> {
            if (show && !vars.App.selectedMusicVideos.length) return;

            let get = vars.UI.getElementByID;

            let count = vars.App.selectedMusicVideos.length;

            let className = !show ? 'hidden' : '';
            let dP = get('deletePopUp');
            dP.className = className;
            dP.style.zIndex = show ? 20: -20;

            show && (get('warningText').innerHTML = `You are about to remove ${count} file${count>1 ? 's':''}?<p>${count>1? 'They': 'It'} will no longer show in the list!<div style="padding: 0px; margin: 40px 0px;">Continue?</div>`);
        },
        showChangeMVImageButton: (show=true)=> {
            let div = vars.UI.getElementByID('nextMusicVideoImage');
            div.className = show ? '' : 'hidden';
        },
        showCurrentlyPlayingPopUp: (show=true, msg='')=> {
            if (show && !msg) return 'If youre showing the popup, it must have a msg with it (with the songs name)';

            let cPPU = vars.UI.getElementByID('currentlyPlayingPopUp');
            cPPU.className = show ? 'currentlyPlayingShow' : 'currentlyPlayingHide';
            if (!show) return;
            
            // we're showing the div
            // set the msg
            cPPU.innerHTML = msg;

            // hide it after 5 seconds
            cPPU.timeout = setTimeout(()=> {
                if (!cPPU.timeout) return;

                cPPU.className !== 'currentlyPlayingHide' && (cPPU.className = 'currentlyPlayingHide');
                delete(cPPU.timeout);
            },5000);
        },

        showFolderContents: (div,folderName)=> {
            let trackContainer = div.parentElement.parentElement.lastChild;
            let c = trackContainer.className;
            if (c.includes('hidden')) {
                trackContainer.className = c.replace('hidden','');
                trackContainer.className = trackContainer.className.trim();
            } else {
                trackContainer.className += ' hidden';
            };
        },

        showFloatingButtons: (show=true)=> {
            let aV = vars.App;
            let className = ''; // default for show=true
            if (show && !aV.floatingButtonsVisible) {
                aV.floatingButtonsVisible=true;
            } else if (!show && aV.floatingButtonsVisible) {
                aV.floatingButtonsVisible=false;
                className = 'hidden';
            } else {
                return;
            };

            vars.UI.getElementByID('floatingButtonsContainer').className = className;
        },

        showFloatingGenresContainer: (e,div,show=true,rightClick=false)=> {
            let UI = vars.UI;
            let fGC = UI.getElementByID('floatingGenresContainer');
            
            if (!show) { fGC.className = 'hidden'; vars.App.showingSelectByGenre = false; return; }; // hiding the div?

            // if we get here we're showing the div
            let gOffsetY = div.offsetTop;
            // show the pop up (needed so we can get offsetHeight below - if its hidden its height will be 0)
            fGC.className = '';

            if (rightClick) {
                UI.showFloatingGenresAtCursor(e,fGC);
                return;
            };

            fGC.style.left = ''; // reset the left var if its set

            // reposition the fGC
            let fGHeight = fGC.offsetHeight;
            let y = gOffsetY-(fGHeight/2)-window.scrollY;
            fGC.style.top = `${y}px`;
            // make sure its on screen
            let offTheTopOfScreen = y<0;
            let offTheBottomOfScreen = y+fGHeight>window.innerHeight;
            vars.DEBUG && console.log(`OffTop ${offTheTopOfScreen.toString()}. OffBottom: ${offTheBottomOfScreen.toString()}`);

            if (offTheTopOfScreen) {
                fGC.style.top = '10px';
            } else if (offTheBottomOfScreen) {
                vars.DEBUG && console.log(`Moving fGC up`);
                let newY = window.innerHeight-fGHeight-10;
                fGC.style.top = `${newY}px`;
            };

            // highlight the genres assoc with this video
            let sha = div.parentElement.dataset.sha;
            // validate teh sha
            if (sha.length!==64) return false;
            
            // find the genres array by sha
            let found = vars.files.musicVideoObject.find(m=>m.sha256===sha);
            if (!found) return false;
            let genres = found.genres;
            vars.UI.highlightGenres(genres);
        },
        showFloatingGenresAtCursor: (e,fGC)=> {
            vars.App.showingSelectByGenre = true;
            // first, unhighlight all genres
            vars.UI.unhighlightAllGenres();

            // now highlight the selected genres
            // start highlighting for this music video
            let genres = vars.App.selectedGenres;
            let gID = vars.UI.getElementByID;
            genres.forEach((g)=> {
                gID(`genre_${g}`).className = 'genre highlight';
            });

            // set the x and y based on where the pointer is
            let x = e.clientX;
            let y = e.clientY;
            fGC.style.left=`${x}px`;
            fGC.style.top=`${y}px`;

            // make sure it isnt off the screen (to the right)
            // NOTE: offsets are calculated, so we have to set the xy (above) then check if its off the screen)
            if (fGC.offsetLeft + fGC.offsetWidth > window.innerWidth) {
                x = window.innerWidth - fGC.offsetWidth - 30;
                fGC.style.left=`${x}px`;
            };

            // make sure it isnt off the top/bottom of the screen
            if (y<0) {
                fGC.style.top="10px";
            } else if (y+fGC.offsetHeight>window.innerHeight) {
                y = window.innerHeight - fGC.offsetHeight;
                fGC.style.top=`${y}px`;
            };
        },

        showGenreButton: (e,div,show=true)=> {
            if (show) {
                let UI = vars.UI;
                div.lastChild.className = 'genreButton';
                let sha = div.dataset.sha;
                if (!sha || vars.UI.currentlyOver===sha) return;

                // update the currently over sha and hide the floating genres container
                UI.currentlyOver = div.dataset.sha;
                UI.showFloatingGenresContainer(null,null,false,false);
            } else {
                // we are hiding the genre button, make sure the floating genres container is NOT visible
                div.lastChild.className = 'genreButton hidden';
            };
        },

        showTable: (show=true)=> {
            vars.UI.getElementByID('table').className = show ? '' : 'hidden';
        },

        showWarningPopUp: (show=true,msg)=> {
            if (!msg && show) return 'When showing the popup, you must pass in a message';

            let UI = vars.UI;
            let className = show ? '' : 'hidden'
            let wPU = UI.getWarningPopUp();
            wPU.className = className;
            show && (wPU.innerHTML = msg + '<p class="closeWarning">[Close warning window by clicking on it]</p>');
            show && UI.updateWarningPopUpPosition();
        },

        showYTDownloader: (show=true)=> {
            vars.UI.getElementByID('ytDownloader').className= show ? '' : 'hidden';

            if (show) {
                let gID = vars.UI.getElementByID;
                let ytURL = gID('ytURL');
                ytURL.focus();
            };
        },

        switchView: (e,div)=> {
            let UI = vars.UI;
            let views = UI.views;
            let currentView = UI.currentView;
            let index = views.findIndex(m=>m===currentView);
            index++;
            index===views.length && (index=0);

            // hide the change mv image button
            vars.UI.showChangeMVImageButton(false);

            let newView = UI.currentView = views[index];
            
            let gID = UI.getElementByID;
            // hide the current view (ignored if the current view is images small)
            if (currentView!=='images-s') {
                let currentViewDivID = '';
                switch (currentView) {
                    case 'images-l': currentViewDivID = 'musicVideoImages'; break;
                    case 'list': currentViewDivID = 'list'; break;
                    case 'table': currentViewDivID = 'table'; break;
                    // the next error should NEVER happen as its saying the "current view" DOESNT have an ID associated with it
                    // if thats true, how is the "current view" currently visible?
                    // the only reason would be if Im testing a new view and have forced it without implementing its "switch" function
                    // ie, its simply left here for debugging purposes
                    default: console.error(`The current view (${currentView}) has no div id associated with it.\nExiting.`); return; break;
                };
                gID(currentViewDivID).className = 'hidden';
            };


            let divID = '';
            // show the new view (ignored if the new view is images large)
            if (newView!=='images-l') {
                switch (newView) {
                    case 'images-s': divID = 'musicVideoImages'; break;
                    case 'list': divID='list'; break;
                    case 'table': divID='table'; break;
                    default: console.error(`The new view (${newView}) has no div id associated with it.\nExiting.`); return; break;
                };
                // show the new view
                gID(divID).className = '';
            };



            // change the "current view" div's html (and css)
            let vB = gID('viewBy');
            if (newView.startsWith('images')) {
                if (newView==='images-s') {
                    gID('musicVideoImages').className='mv-images-small';
                    vB.style.width="250px";
                } else {
                    gID('musicVideoImages').className='';
                };
            } else {
                vB.style.width="170px";
            }; 
            let type = UI.viewNames[index];
            div.innerHTML = `Current View: ${type}`;
        },

        updateTheComingUpList: ()=> {
            let list = vars.App.selectedMusicVideos;

            let nowHeader = '<div class="c-u-header now-header">NOW</div>';
            let nextHeader = '<div class="c-u-header next-header">COMING UP</div>';
            let html = '';

            let count = list.length<4 ? list.length : 4;
            if (count) {
                for (let i=0; i<count; i++) {
                    let mvName = list[i][0];
                    let className = i ? ' next' : ' now';
                    !i && (html+=nowHeader);
                    i===1 && (html+=nextHeader);
                    let mvSafe = mvName.replaceAll("'", "\\'");
                    let del = i ? `<span style="color: red; cursor: pointer" onclick="vars.App.removeSongFromNextList('${mvSafe}')">🞮</span> ` : '';
                    html += `<div class="coming-up${className}">${del}${mvName}</div>`;
                };
            };

            vars.UI.getElementByID('comingUpList').innerHTML = html;
        },

        updateWarningPopUpPosition: ()=> {
            let wPU = vars.UI.getWarningPopUp();
            if (wPU.className==='hidden') return;

            wPU.style.left = `${(window.innerWidth - wPU.offsetWidth)/2}px`;
            wPU.style.top = `${(window.innerHeight - wPU.offsetHeight)/2}px`;
        },

        unhighlightAllGenres: ()=> {
            let genres = document.getElementsByClassName('genre');
            for (let g=0; g<genres.length; g++) {
                genres[g].className = 'genre';
            };
        }
    }
};