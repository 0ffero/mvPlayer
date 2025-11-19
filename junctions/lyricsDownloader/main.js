var vars = {
    lastResponse: '',
    cachedLyricsLoaded: false,
    goClicked: false,

    init: ()=> {
        const fetcher       = new LyricsFetcher();
        const form          = document.getElementById('lyricsForm');
        const artistEl      = document.getElementById('artist');
        const trackEl       = document.getElementById('track');
        const albumEl       = document.getElementById('album');
        const durEl         = document.getElementById('duration');
        const preview       = document.getElementById('preview');
        const loading       = document.getElementById('loading');
        const fetchBtn      = document.getElementById('fetchBtn');
        const clearBtn      = document.getElementById('clearBtn');
        const copyBtn       = document.getElementById('copyBtn');
        const openBtn       = document.getElementById('openBtn');
        const historyEl     = document.getElementById('history');
        const lastFetched   = document.getElementById('lastFetched');
        const jrCloseButton = document.getElementById('jrCloseButton');
        jrCloseButton.addEventListener('click', () => {
            document.getElementById('jsonResponseContainer').classList.remove('active');
            copyBtn.textContent = 'Show Source JSON';
        });

        let queryString = window.location.search;
        let urlParams = new URLSearchParams(queryString);
        let urlParamList = ['artist','track','album','duration','sha','go'];
        urlParamList.forEach(p=> {
            if (p==='sha' || p==='go') { // the sha is used for saving the data to disk. its the requesting URL's music video hash
                switch (p) {
                    case 'sha':
                        vars.shaForEntry = urlParams.get(p);
                        return; // skip
                    break;
                    case 'go':
                        if (urlParams.get(p) === 'true') {
                            vars.goClicked = true;
                        };
                        return; // skip
                    break;
                };
            };
            document.getElementById(p).value = urlParams.get(p) || '';
        });

        loadAllLyrics();

        async function loadAllLyrics() {
            try {
                vars.goClicked && waitForCacheLoad();
                const resp = await fetch('getAllSavedLyrics.php');
                if (!resp.ok) throw new Error('Failed to fetch saved lyrics: ' + resp.status);
                const json = await resp.json();
                vars.allCachedLyrics = json.data;
                vars.cachedLyricsLoaded = true;
                // check if sha was found in the data
                if (vars.shaForEntry) {
                    let found = vars.allCachedLyrics.find(l=>l.sha===vars.shaForEntry);
                    if (found) {
                        showPreview(found.mvData || 'No data found in saved entry.');
                        // disable the search button as we already have the saved data
                        fetchBtn.disabled = true;
                        fetchBtn.style.background = '#555';
                        lastFetched.textContent = `Loaded saved entry for SHA: ${vars.shaForEntry}`;
                        return;
                    };
                };
                return json;
            } catch (err) {
                console.warn('Error loading saved lyrics', err);
                vars.allCachedLyrics = [];
                return [];
            }
        }

        function setLoading(on) {
            loading.style.display = on ? 'block' : 'none';
            fetchBtn.disabled = on;
        }

        function showPreview(content) {
            preview.innerHTML = '';
            if (typeof content === 'object') {
                //preview.textContent = JSON.stringify(content, null, 2);
                let rsList = ["id","name","trackName","artistName","albumName","duration","instrumental","plainLyrics","syncedLyrics"];
                rsList.forEach(key => {
                    if (content[key]) {
                        if (key === "plainLyrics" || key === "syncedLyrics") {
                            preview.innerHTML += `<h3>${key}</h3><pre style="white-space:pre-wrap; word-break:break-word; margin-top:4px; margin-bottom:12px;">${content[key]}</pre>`;
                        } else {
                            preview.innerHTML += `<strong>${key}:</strong> ${content[key]}<br/>`;
                        }
                    }
                });
                document.getElementById('jsonResponseContainer').querySelector('pre').innerHTML = JSON.stringify(content, null, 2).replaceAll(/\\n/g,'\n');
            } else {
                preview.textContent = String(content);
            };
            vars.lastResponse = preview.textContent;
        };

        function waitForCacheLoad() {
            setTimeout(() => {
                if (vars.cachedLyricsLoaded) {
                    if (fetchBtn.disabled) return; // already disabled (songs lyrics are in cache)
                    // auto-submit the form
                    setTimeout(() => {
                        fetchBtn.click();
                    }, 500);
                    return;
                };
                waitForCacheLoad();
            }, 500);
        };

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const artist = artistEl.value.trim();
            const track = trackEl.value.trim();
            const album = albumEl.value.trim();
            const duration = durEl.value ? Number(durEl.value) : '';

            if (!artist || !track) { alert('Please enter both artist and track names.'); return; }

            setLoading(true);
            showPreview('Fetching...');
            lastFetched.textContent = '';
            try {
                const result = await fetcher.fetchLyrics({ artist_name: artist, track_name: track, album_name: album, duration });
                showPreview(result.body || `Status ${result.status}`);
                lastFetched.textContent = `Status: ${result.ok ? 'OK' : 'Error'} • HTTP ${result.status}`;
                //saveHistory({ url: result.url, artist, track, album: album || null, duration: duration || null, when: new Date().toISOString() });
                openBtn.dataset.url = result.url;
                try {
                    const payload = {
                        sha: vars.shaForEntry || null,
                        body: result.body || null,
                        artist,
                        track,
                        album: album || null,
                        duration: duration || null,
                        when: new Date().toISOString()
                    };

                    const resp = await fetch('saveToJSON.php', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });

                    if (resp.ok) {
                        const json = await resp.json();
                        console.log('Saved to downloadedLyrics.json', json);
                        lastFetched.textContent += ` • Saved: ${json.success ? 'yes' : 'no'}`;
                    } else {
                        console.warn('Save request failed', resp.status);
                    }
                } catch (e) {
                    console.warn('Error saving to JSON', e);
                }
            } catch (err) {
                showPreview(`Error: ${err.message}`);
                lastFetched.textContent = `Error`;
                openBtn.dataset.url = '';
            } finally { setLoading(false); }
        });

        clearBtn.addEventListener('click', () => {
            artistEl.value = '';
            trackEl.value = '';
            albumEl.value = '';
            durEl.value = '';
            preview.textContent = 'No results yet — enter artist & track and press Get Lyrics.';
            lastFetched.textContent = '';
        });

        copyBtn.addEventListener('click', async () => {
            const container = document.getElementById('jsonResponseContainer');
            const pre = container.querySelector('pre');
            if (container.classList.contains('active')) {
                // hide
                container.classList.remove('active');
                copyBtn.textContent = 'Show Source JSON';
            } else {
                // show
                container.classList.add('active');
                copyBtn.textContent = 'Hide Source JSON';
            };
        });

        openBtn.addEventListener('click', () => {
            const url = openBtn.dataset.url;
            if (!url) { alert('No request URL available yet.'); return; }
            window.open(url, '_blank');
        });
    }
};

vars.init();