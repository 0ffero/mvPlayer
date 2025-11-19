class LyricsGetter {
    /**
     * @param {string} path - relative path to the lyrics JSON file (default: '../../lyrics.json')
     */
    constructor(path = './assets/lyrics.json', options = {}) {
        this.path = path;
        this.ttl = typeof options.ttl === 'number' ? options.ttl : 0;
        this._cache = null;
        this._fetchedAt = 0;

        this._fetchIfNeeded = this._fetchIfNeeded.bind(this);
        this.getAll = this.getAll.bind(this);
        this.reload = this.reload.bind(this);
        this.searchByName = this.searchByName.bind(this);

        this.filtered = [];
        this.searchKeys = [];

        this.getAll();
    }

    async _fetchIfNeeded() {
        if (this._cache && (this.ttl === 0 || Date.now() - this._fetchedAt < this.ttl)) {
            return this._cache;
        };

        const res = await fetch(this.path, { cache: 'no-store' });
        if (!res.ok) {
            const err = new Error(`Failed to fetch lyrics: ${res.status} ${res.statusText}`);
            err.status = res.status;
            throw err;
        }

        const data = await res.json();
        this._cache = data;
        this._fetchedAt = Date.now();
        return this._cache;
    }

    assignSha(sha) {
        this.sha = sha;
        this.checkForSavedLyrics();
    }

    checkForSavedLyrics() {
        if (!this.sha) return;

        this.savedLyrics = vars.App.findLyricsBySha(this.sha);
        this.hasSavedLyrics = this.savedLyrics ? true : false;
    }

    // Public: get whole JSON
    async getAll() {
        return await this._fetchIfNeeded();
    }

    // Public: reload from disk / server ignoring cache
    async reload() {
        this.resetFiltered();
        this._cache = null;
        this._fetchedAt = 0;
        return await this._fetchIfNeeded();
    }

    resetFiltered() {
        this.filtered = [];
        this.searchKeys = [];
    }

    searchByName(name, returnOnly = false) {
        this.searchKeys.push(name);

        let container = document.getElementById('lyricsJsonContainer');
        container.innerHTML = ''; // clear previous results

        if (this.filtered.length) { // this can filter and already filtered list
            let newFiltered = this.filtered.filter(item => item.file_path.toLowerCase().includes(name.toLowerCase()));
            if (newFiltered.length) {
                this.filtered = newFiltered;
            };
        } else { // where the filtered list is originally created here
            this.filtered = this._cache.filter(item => item.file_path.toLowerCase().includes(name.toLowerCase()));
        };

        if (returnOnly) return this.filtered;

        if (this.filtered.length>1) {
            container.innerHTML = `<div class="lyricItem" style="color: red; font-weight: bold;">No Single Match Found!</div>`;
        };

        this.filtered.forEach(f=> {
            // create a new div
            let div = document.createElement('div');
            div.className = 'lyricItem';
            let className = 'lyricItemColumn';
            let textLyrics = f.txt_lyrics;
            let timedLyrics = f.lrc_lyrics;
            if (!textLyrics && !timedLyrics) return; // skip if no lyrics

            let html = `
                <div class="${className} lyricItemTitle" style="width: 600px;">${f.file_name}</div>
                <div class="${className}" style="width: 100px;">${f.duration}s</div>
                <div class="${className}" style="width: 60px; text-align: right;">Text</div>
                <div class="${className}" style="width: 40px;">${!textLyrics ? '<i class="fa-solid fa-square-check lyricsTrue"></i>' : '<i class="fa-solid fa-square-xmark lyricsFalse"></i>'}</div>
                <div class="${className}" style="width: 60px; text-align: right;">Timed</div>
                <div class="${className}" style="width: 40px;">${!timedLyrics ? '<i class="fa-solid fa-square-check lyricsTrue"></i>' : '<i class="fa-solid fa-square-xmark lyricsFalse"></i>'}</div>`;
            div.innerHTML = html;

            container.appendChild(div);
        });
        
        if (!this.filtered.length) {;
            container.innerHTML = '<div class="lyricItem"><i>No results found in the cache file</i></div>';
        };
        
        // are there lyrics already saved for this song? (ie the way I used to download them, via the search button then copying and pasting the result)
        container.innerHTML += `<div class="lyricItem"><div>Has Saved Lyrics (OLD VERSION)?</div><div>${this.hasSavedLyrics ? '<i class="fa-solid fa-square-check lyricsTrue"></i>' : '<i class="fa-solid fa-square-xmark lyricsFalse"></i>'}</div></div>`;

        // now check for the new saved lyrics
        let newLyrics = this.newLyrics = vars.App.hasNewLyricsTypes(this.sha, true);
        if (newLyrics.valid && newLyrics.downloaded) {
            let html = `<div class="lyricItem">
                            <div>Has Saved Lyrics (NEW VERSION)?</div>
                            <div style="margin-left: 15px; cursor: pointer;" onclick="vars.LyricsDownloaderClass.showCachedLyrics('text')">Text: ${newLyrics.txt ? '<i class="fa-solid fa-square-check lyricsTrue"></i>' : '<i class="fa-solid fa-square-xmark lyricsFalse"></i>'}</div>
                            <div style="margin-left: 60px; cursor: pointer;" onclick="vars.LyricsDownloaderClass.showCachedLyrics('timed')">Timed: ${newLyrics.timed ? '<i class="fa-solid fa-square-check lyricsTrue"></i>' : '<i class="fa-solid fa-square-xmark lyricsFalse"></i>'}</div>
                        </div>`;
            container.innerHTML += html;
        } else {
            container.innerHTML += `<div class="lyricItem"><div>Has Saved Lyrics (NEW VERSION)?</div><div><i class="fa-solid fa-square-xmark lyricsFalse"></i></div></div>`;
        };
    }

    showCachedLyrics(type) {
        let lyrics = this.newLyrics;
        if (!lyrics.valid || !lyrics.downloaded) return;

        let content = '';
        if (type === 'text' && lyrics.txt) {
            content = lyrics.txtLyrics;
        } else if (type === 'timed' && lyrics.timed) {
            content = lyrics.timedLyrics;
        } else {
            alert('No lyrics of this type saved.');
            return;
        };

        document.getElementById('cachedLyricsText').innerHTML = `<pre>${content}</pre>`;
        this.showCachedLyricsContainer(true);
    }

    showCachedLyricsContainer(show) {
        let container = document.getElementById('cachedLyricsTextContainer');
        if (show) {
            container.classList.add('active');
            return;
        };

        container.classList.remove('active');
        document.getElementById('cachedLyricsText').innerHTML = '';
    }
}