this.AudioVisualiser = class {
    constructor(options) {
        let msgs = [];
        if (!options.audioPlayer) {
            msgs.push(`Audio tag wasnt passed`);
        };
        if (!options.canvas) {
            msgs.push(`Canvas wasnt passed`);
        };

        if (msgs.length) {
            console.error(msgs.join("\n"));
            return false;
        };

        this.audioPlayer = options.audioPlayer;
        this.canvas = options.canvas;

        this.name = 'Audio Visualiser';
        this.description = `Audio visualiser for html audio component`;

        this.init();
        this.setAudioContext();
    }

    init() {
        this.canvasCtx = this.canvas.getContext("2d");

        this.fftSize = 256;
        this.barWidth = 520 / 64;

        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();

        this.audioSource = null;
        this.analyser = null;
    }


    animate() {        
        if (this.audioPlayer.paused) return;

        this.canvasCtx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        const bufferLength = this.analyser.frequencyBinCount; // the number of data values that dictate the number of bars in the canvas. Always exactly one half of the fft size
        const dataArray = new Uint8Array(bufferLength); // convert to 8-bit integer array

        let cH = this.canvas.height;
        let max = 255;
        let barHeight;

        let currentX = 0;
        this.analyser.getByteFrequencyData(dataArray); // copies frequency data into the dataArray

        for (let i = 0; i < bufferLength; i++) {
            barHeight = dataArray[i];

            const r = (i * barHeight) / 10;
            const g = i * 4;
            const b = barHeight / 4 - 12;
            this.canvasCtx.fillStyle = `rgb(${r}, ${g}, ${b})`;
            
            let actualHeight = barHeight/max*cH|0;

            this.canvasCtx.fillRect(currentX, this.canvas.height - actualHeight, this.barWidth, actualHeight);
            currentX += this.barWidth;
        };
    }

    clearVisInterval() {
        clearInterval(this.updateInterval);
    }

    describe() {
        console.log(`${this.name}\n${this.description}`);
    }

    error(msg) {
        console.error(msg);
    }

    getElementByID(id) {
        if (!id) return false;

        return document.getElementById(id);
    }

    setAudioContext() {
        this.audioSource = this.audioCtx.createMediaElementSource(this.audioPlayer); // creates audio node from audio source
        this.analyser = this.audioCtx.createAnalyser(); // create analyser
        this.analyser.fftSize = this.fftSize;
        this.audioSource.connect(this.analyser); // connect audio source to analyser.
        this.analyser.connect(this.audioCtx.destination); // connect analyser to destination (speakers).
    }

    update() {
        this.animate();
    }

};