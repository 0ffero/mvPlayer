class AudioPlayer {
    constructor() {
        // DIVs
        this.musicHTML;
        this.musicContainer;
        this.musicList;
        // End of DIVs

        this.musicFolder = '.\\assets\\music\\';

        this.playList = [];
        this.shuffling = false;
        this.currentlyPlayingIndex = -1;
        this.highlightedTrack = '';

        // auto play var controls what happens when
        // the first track is added to the playlist
        // if auto play is true:
        //     as soon as there is at least one track added to the playlist, the first track will play
        this.autoPlay = vars.App.autoplayAudioTracks;

        this.gID = vars.UI.getElementByID;

        this.getAudioPlayerControls();

        this.init();
    }

    init() {
        this.initKeyboard();
        this.initUI();
    }

    initKeyboard() {
        window.addEventListener('keyup', (k)=> {
            switch (k.key) {
                case 'Delete':
                    if (!this.highlightedTrack) return;

                    // delete the track from the listing
                    this.addTrackToPlayListDo(this.highlightedTrack);
                    this.highlightedTrack = '';
                break;
            };
        });
    }

    initPlayer() {
        let gID = this.gID;
        let mLC = this;
        let aP = this.audioPlayer = gID('audioPlayer');
        aP.addEventListener("ended", (event) => {
            mLC.playNext();
        });
        aP.addEventListener("canplay", (event) => {
            aP.play();
        });
    }

    initUI() {
        let gID = this.gID

        let mC = this.musicContainer = gID('musicContainer');
        mC.show = this.showMusicContainer;

        this.initPlayer();

        this.trackListUI = gID('sTList');
        
        this.buildMusicList();

        switch (vars.App.recent) {
            case 'video':
                mC.show(false);
            break;

            case 'music':
                mC.show(true);
            break;

            default:
                console.error(`Unknown recent value ${vars.App.recent}\nShowing music videos`);
                return;
            break;
        };
    }

    addAlbumToPlaylist(div,folderName) {
        let els = div.parentElement.parentElement.getElementsByClassName('trackName');
        for (let t=0; t<els.length; t++) {
            els[t].click();
        };
    }

    addTrackToPlayListDo(fileName) {
        let mPL = this.playList;
        let index = mPL.findIndex(t=>t===fileName);
        if (index>-1) { // file's already in the playlist. remove it
            mPL.splice(index,1);
            // find the div and remove it
            this.removeTrackFromUI(fileName);
            return;
        }

        // file wasnt found, add it to play list
        // is this the first track to be added to the playlist?
        let playTrack = !mPL.length && this.autoPlay ? true : false;
        mPL.push(fileName);
        // add the file to the div
        this.addTrackToUI(fileName);

        if (playTrack) {
            this.playNext();
        };
    }

    addTrackToPlayList(folder,trackName) {
        let fileName = folder + '\\' + trackName;
        this.addTrackToPlayListDo(fileName);
    }

    addTrackToUI(fileName) {
        let fileNameString = fileName.split('\\');
        fileNameString = fileNameString.pop();
        ['.mp3','.flac','.m4a'].forEach((ext)=> {
            fileNameString = fileNameString.replace(ext,'');
        });
        let html = `<div class="playlistTrack" onclick="vars.UI.musicListClass.trackClick(this)" data-fname="${fileName}">${fileNameString}</div>`;
        this.trackListUI.innerHTML += html;
    }

    autoPlaySwitch() {
        let aP = vars.UI.musicListClass;
        aP.autoPlay = !aP.autoPlay;

        vars.App.autoplayAudioTracks = aP.autoPlay;
        vars.localStorage.saveAutoplay();

        aP.autoPlayButton.className = aP.autoPlay ? 'autoplayOn' : 'autoplayOff';
    }

    buildMusicList() {
        let gID = this.gID;

        let mL = this.musicList = [...vars.App.musicList];
        mL.forEach((t)=> {
            let fName = t.folder;
            let folderName = fName.replaceAll('\\','\\\\').replaceAll('\'','\\\'');
            let tracks = t.tracks;

            vars.musicHTML += `<div><div class="folderNameHeader"><div class="addAlbum" onclick="vars.UI.musicListClass.addAlbumToPlaylist(this,'${folderName}')">[ADD ALL]</div><div class="folderName" onclick="vars.UI.showFolderContents(this, '${folderName}')">${fName}</div></div><div class="trackcontainer hidden">`;
            tracks.forEach((t)=> {
                let tClean = t.replaceAll('\'','\\\'');
                vars.musicHTML += `<div class="trackName" onclick="vars.UI.musicListClass.addTrackToPlayList('${folderName}','${tClean}')">${t}</div>`;
            });
            vars.musicHTML += `</div></div>`;
        });
        this.musicHTML = vars.musicHTML;

        let mCF = this.folderList = gID('mC_FolderList');
        mCF.innerHTML = vars.musicHTML;
        mCF.style.height = `${window.innerHeight - 91}px`;
    }

    emptyPlaylist() {
        if (!this.playList.length) return;

        this.currentlyPlayingIndex = -1;
        this.highlightedTrack = '';
        this.playList = [];
        this.trackListUI.innerHTML = '';
        this.audioPlayer.pause();
        this.audioPlayer.src = '';
    }

    getAudioPlayerControls() {
        let gID = this.gID;
        let tP = this.previousTrackButton = gID('audioPrevious');
        tP.onclick = ()=> {
            vars.UI.musicListClass.getPreviousTrack();
        };

        let tN = this.nextTrackButton = gID('audioNext');
        tN.onclick = ()=> {
            vars.UI.musicListClass.getNextTrack();
        };

        let aP = this.autoPlayButton = gID('autoplay');
        aP.onclick = this.autoPlaySwitch;
        aP.className = this.autoPlay ? 'autoplayOn' : 'autoplayOff';
    }

    getNextTrack() {
        vars.DEBUG && console.log(`Getting next track`);
        this.playNext();
    }

    getPlaylistDiv(fileName) {
        return Object.values(this.trackListUI.childNodes).find(m=>m.dataset.fname===fileName);
    }

    getPreviousTrack() {
        vars.DEBUG && console.log(`Getting previous track`);
        // unhighlight the current index
        this.unhighlightPlayListTrack();

        this.currentlyPlayingIndex = clamp(this.currentlyPlayingIndex-2,-1, this.playList.length-1);  // we remove two from this as we use play next
        this.playNext();
    }

    playNext() {
        // unhighlight the song that just ended
        this.unhighlightPlayListTrack();

        this.currentlyPlayingIndex++;

        let index = this.currentlyPlayingIndex;
        let pL = this.playList;
        if (!pL[index]) { // last song played!
            this.currentlyPlayingIndex = -1; // reset the current playing int
            console.log(`%cLast song in list played!`,'color: #ff8000; font-weight: bold;');
            // we need to unset the src
            this.audioPlayer.src = '';
            return;
        };

        let fileName  = pL[index];
        // highlight the playlist entry
        let pLE = this.getPlaylistDiv(fileName);
        if (pLE.className.includes('highlighted')) {
            this.highlightedTrack = '';
        };
        pLE.className = 'playlistTrack playing';
        this.audioPlayer.src = this.musicFolder + fileName;
    }
    playSpecific(fileName) {
        let pL = this.playList;
        let index = pL.findIndex(t=>t===fileName);
        this.currentlyPlayingIndex = index-1; // select the previous track as we simply call play next
        this.playNext();
    }

    pause(pause=true) {
        pause ? this.audioPlayer.pause() : this.audioPlayer.play();
    }

    removeTrackFromUI(fileName) {
        this.getPlaylistDiv(fileName).remove();
    }

    showMusicContainer(show) { // we are calling this from inside the div! so "this" is actually the div, not the class!
        let aV = vars.App;
        let mC = this;
        let dS = document.body.style;
        if (show) {
            mC.className = '';
            dS.overflowY = 'hidden';
            aV.recent = 'music';
            vars.localStorage.saveDefaultView();
            return;
        };
            
        mC.className = 'hidden';
        dS.overflowY = 'visible';
        aV.recent = 'video';
        vars.localStorage.saveDefaultView();
    }

    shufflePlaylist() {
        this.pause();
        let pL = this.playList;
        shuffle(pL);

        this.trackListUI.innerHTML = '';

        pL.forEach((fileName)=> {
            this.addTrackToUI(fileName);
        });

        this.playNext();
    }

    trackClick(div) {
        let fName = div.dataset.fname;

        if (div.className.includes('playing')) { // (un)pause the song
            this.audioPlayer.paused ? this.audioPlayer.play() : this.audioPlayer.pause();
            return;
        };

        if (div.className==='playlistTrack') { // highlight the track (clicking it again will skip to this song)
            // check for currently highlighted
            let hL = document.getElementsByClassName('highlighted')
            if (hL.length) { hL[0].className = 'playlistTrack'; }
            // highlight this track
            div.className = 'playlistTrack highlighted';
            this.highlightedTrack = fName;
            return;
        };

        if (div.className==='playlistTrack highlighted') { // the highlighted track has been clicked again
            this.audioPlayer.pause(); // stop the current track

            this.highlightedTrack = '';
            
            // unhighlight the currently playing track
            this.unhighlightPlayListTrack();

            // load the selected track            
            this.playSpecific(fName);
        };

    }

    unhighlightPlayListTrack() {
        let currentSongIndex = this.currentlyPlayingIndex;
        if (currentSongIndex === -1) return; // no previous song, ignore the call

        let fileName = this.playList[currentSongIndex];
        this.getPlaylistDiv(fileName).className = 'playlistTrack';
    }
}