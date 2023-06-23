window.addEventListener("selectstart", e => e.preventDefault());

window.addEventListener('keyup', (e)=> {
    if (vars.App.video.getVideoDiv().paused) return;
    if (e.code==='KeyN' && e.shiftKey) {
        vars.App.video.playNext();
        return;
    };

    if (e.code==='KeyF') {
        if (!document.fullscreenElement) {
            vars.App.video.getVideoDiv().requestFullscreen();
            return;
        };
    };

    if (e.code==='Space') {
        vars.App.video.getVideoDiv().paused = !vars.App.video.getVideoDiv().paused;
        return;
    };

    if (e.code==='ArrowLeft' || e.code==='KeyJ') {
        let v = vars.App.video.getVideoDiv();
        let newTime = e.code==='ArrowLeft' ? 5 : 10;
        newTime = v.currentTime - newTime;
        if (newTime<0) newTime = 0;
        v.currentTime = newTime;
        return;
    };

    if (e.code==='ArrowRight' || e.code==='KeyL') {
        let v = vars.App.video.getVideoDiv();
        let newTime = e.code==='ArrowRight' ? 5 : 10;
        newTime = v.currentTime + newTime;
        if (newTime>v.duration) {
            vars.App.video.playNext();
            return;
        };
        v.currentTime = newTime;
        return;
    };
});

window.onresize =()=> {
    vars.App.updateTableColumns();
};




vars.App.init();