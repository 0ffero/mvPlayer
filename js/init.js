window.addEventListener("selectstart", e => e.preventDefault());

window.addEventListener('keyup', (e)=> {
    if (vars.App.video.getVideoDiv().paused && document.getElementById('audioPlayer').paused) return;
    if (e.code==='KeyN' && e.shiftKey) {
        vars.App.video.playNext();
        return;
    };

    if (e.code==='KeyF') {
        if (!document.fullscreenElement) {
            vars.App.fullScreenVideo();
            return;
        };
    };

    if (e.code==='Space') {
        vars.App.video.getVideoDiv().paused = !vars.App.video.getVideoDiv().paused;
        return;
    };

    if (e.code==='ArrowLeft' || e.code==='KeyJ') {
        if (document.getElementById('audioPlayer').paused) { // audio player isnt doing anything, assume video player is active
            let v = vars.App.video.getVideoDiv();
            if (v.paused) return; // video player isnt doing anything, ignore the call

            let newTime = e.code==='ArrowLeft' ? 5 : 10;
            newTime = v.currentTime - newTime;
            if (newTime<0) newTime = 0;
            v.currentTime = newTime;
            return;
        } else {
            let a = document.getElementById('audioPlayer');
            if (a.paused) return; // audio player isnt doing anything, assume video player is active

            let newTime = e.code==='ArrowLeft' ? 5 : 10;
            newTime = a.currentTime - newTime;
            if (newTime<0) newTime = 0;
            a.currentTime = newTime;
            return;
        };
    };

    if (e.code==='ArrowRight' || e.code==='KeyL' || e.key==='MediaTrackNext') {
        if (e.key==='MediaTrackNext' && document.getElementById('audioPlayer').paused) { // audio player isnt doing anything, assume video player is active
            let v = vars.App.video.getVideoDiv();
            if (v.paused) return; // video player isnt doing anything, ignore the call

            let newTime = e.code==='ArrowRight' ? 5 : 10;
            newTime = v.currentTime + newTime;
            if (newTime>v.duration || e.key==='MediaTrackNext') {
                vars.App.video.playNext();
                return;
            };
            v.currentTime = newTime;
            return;
        } else {
            let a = document.getElementById('audioPlayer');
            if (a.paused) return; // audio player isnt doing anything, assume video player is active

            let newTime = e.code==='ArrowRight' ? 5 : 10;
            newTime = a.currentTime + newTime;
            if (newTime>a.duration || e.key==='MediaTrackNext') {
                vars.UI.musicListClass.getNextTrack();
                return;
            };
            a.currentTime = newTime;
            return;
        };
    };
});

window.onresize =()=> {
    vars.App.updateTableColumns();
    vars.UI.updateWarningPopUpPosition();
};

document.body.addEventListener('contextmenu', (e)=> {
    e.preventDefault();
    if (e.target.id==='uploadLyrics') { // right click on upload lyrics button
        vars.files.sendLyricsToServer(true);
        return;
    };

    // show the floating genres selector
    let UI = vars.UI;
    let div = UI.getElementByID('floatingGenresContainer');
    UI.showFloatingGenresContainer(e,div,true,true);
    return false;
}, false);


vars.App.init();