let VideoPlayer = class {
    constructor(_id) {
        if (!_id || _id.length!==11 || !checkType(_id,'string')) {
            console.error(`Invalid ID passed. Exiting.`);
            return false;
        };

        this.vC = vars.getElementById('videoContainer');
        // is this video currently loaded? If so, just show the container again
        if (vars.UI.vID===_id) { this.show(); return; };

        this.id = vars.UI.vID = _id;
        this.videoHTML = `<iframe id="yt_video" width="560" height="315" src="https://www.youtube.com/embed/${this.id}?enablejsapi=1" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>`;
        this.heading = consts.youtube_ids[_id];
        if (!this.heading) { console.warn(`No heading was found for the video ID: ${_id}!\nGeneration will continue but a heading should be added`) };

        this.init();

    }
    
    init() {
        this.html = `<div id="videoHeading">${this.heading || 'Youtube Video'}</div>${this.videoHTML}<div id="videoClose" onclick="vars.UI.closeVideo()" class="button">CLOSE</div>`;
        
        
        this.vC.innerHTML = this.html;

        this.show();
    }

    show() {
        this.vC.className='fade-in-flex';
        this.vC.style.zIndex = 10;
        vars.UI.switchOverflow();
    }
};