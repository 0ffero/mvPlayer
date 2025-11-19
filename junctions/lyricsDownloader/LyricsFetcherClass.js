class LyricsFetcher {
    constructor(base = 'https://lrclib.net/api/get') {
        this.base = base.replace(/\/+$/, '');
    }

    // build URL with URLSearchParams and proper encoding
    buildURL({ artist_name, track_name, album_name, duration } = {}) {
        const params = new URLSearchParams();
        if (artist_name) params.set('artist_name', artist_name);
        if (track_name) params.set('track_name', track_name);
        if (album_name) params.set('album_name', album_name);
        if (typeof duration !== 'undefined' && duration !== null && duration !== '') params.set('duration', String(duration));
        return `${this.base}?${params.toString()}`;
    }

    // fetch the lyrics; returns a promise that resolves to parsed JSON if possible, otherwise raw text
    async fetchLyrics({ artist_name, track_name, album_name, duration } = {}) {
        if (!artist_name || !track_name) throw new Error('artist_name and track_name are required');
        const url = this.buildURL({ artist_name, track_name, album_name, duration });
        const res = await fetch(url, { method: 'GET' });
        // Try parse as JSON, otherwise text
        const contentType = res.headers.get('Content-Type') || '';
        let body;
        if (contentType.includes('application/json')) {
            body = await res.json();
        } else {
            body = await res.text();
            // Attempt to detect if it's JSON-like
            try { body = JSON.parse(body); } catch (e) { /* leave as text */ }
        }
        return { url, status: res.status, ok: res.ok, body };
    }
};