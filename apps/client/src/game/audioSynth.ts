export class AudioSynth {
    private ctx: AudioContext;
    private bgmMasterGain: GainNode | null = null;
    private bgmStep: number = 0;
    private bgmInterval: any = null;
    private isBgmPlaying: boolean = false;

    constructor() {
        this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    private createGain(start: number, end: number, duration: number) {
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(start, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(end || 0.0001, this.ctx.currentTime + duration);
        return gain;
    }

    public playClick() {
        const osc = this.ctx.createOscillator();
        const gain = this.createGain(0.3, 0.0001, 0.1);
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(400, this.ctx.currentTime + 0.1);
        
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        
        osc.start();
        osc.stop(this.ctx.currentTime + 0.1);
    }

    public playSlash() {
        const bufferSize = this.ctx.sampleRate * 0.15;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const source = this.ctx.createBufferSource();
        source.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(3000, this.ctx.currentTime);
        filter.frequency.exponentialRampToValueAtTime(1000, this.ctx.currentTime + 0.15);

        const gain = this.createGain(0.4, 0.0001, 0.15);

        source.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        source.start();
        source.stop(this.ctx.currentTime + 0.15);
    }

    public playExplosion() {
        const duration = 0.8;
        const bufferSize = this.ctx.sampleRate * duration;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const source = this.ctx.createBufferSource();
        source.buffer = buffer;

        // Low rumble
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(800, this.ctx.currentTime);
        filter.frequency.exponentialRampToValueAtTime(30, this.ctx.currentTime + duration);

        // Distortion for "grit"
        const dist = this.ctx.createWaveShaper();
        dist.curve = this.makeDistortionCurve(400);

        const gain = this.createGain(0.8, 0.0001, duration);

        source.connect(filter);
        filter.connect(dist);
        dist.connect(gain);
        gain.connect(this.ctx.destination);

        // Sub-bass thump
        const osc = this.ctx.createOscillator();
        const subGain = this.createGain(0.6, 0.0001, 0.3);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(100, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(20, this.ctx.currentTime + 0.3);
        osc.connect(subGain);
        subGain.connect(this.ctx.destination);

        source.start();
        osc.start();
        source.stop(this.ctx.currentTime + duration);
        osc.stop(this.ctx.currentTime + duration);
    }

    private makeDistortionCurve(amount: number) {
        const k = typeof amount === 'number' ? amount : 50;
        const n_samples = 44100;
        const curve = new Float32Array(n_samples);
        const deg = Math.PI / 180;
        for (let i = 0 ; i < n_samples; ++i ) {
            const x = i * 2 / n_samples - 1;
            curve[i] = ( 3 + k ) * x * 20 * deg / ( Math.PI + k * Math.abs(x) );
        }
        return curve;
    }

    public playPickup() {
        // Double chime for premium feel
        const playChime = (delay: number, freq: number) => {
            const osc = this.ctx.createOscillator();
            const gain = this.createGain(0.2, 0.0001, 0.3);
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, this.ctx.currentTime + delay);
            osc.frequency.exponentialRampToValueAtTime(freq * 1.5, this.ctx.currentTime + delay + 0.3);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(this.ctx.currentTime + delay);
            osc.stop(this.ctx.currentTime + delay + 0.3);
        };
        
        playChime(0, 440);
        playChime(0.1, 880);
    }

    public playRocket(duration: number) {
        // 1. High Velocity Noise (Wush)
        const bufferSize = this.ctx.sampleRate * duration;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

        const noiseSource = this.ctx.createBufferSource();
        noiseSource.buffer = buffer;

        const noiseFilter = this.ctx.createBiquadFilter();
        noiseFilter.type = 'bandpass';
        noiseFilter.frequency.setValueAtTime(2000, this.ctx.currentTime);
        noiseFilter.Q.setValueAtTime(1, this.ctx.currentTime);

        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(0, this.ctx.currentTime);
        noiseGain.gain.linearRampToValueAtTime(0.4, this.ctx.currentTime + 0.05); 
        noiseGain.gain.setValueAtTime(0.4, this.ctx.currentTime + duration - 0.1);
        noiseGain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);

        noiseSource.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(this.ctx.destination);

        // 2. Heavy Engine Roar (Low-End Power)
        const createOsc = (freq: number, type: OscillatorType, g: number) => {
            const osc = this.ctx.createOscillator();
            osc.type = type;
            osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(freq * 0.8, this.ctx.currentTime + duration);

            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(freq * 2, this.ctx.currentTime);

            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0, this.ctx.currentTime);
            gain.gain.linearRampToValueAtTime(g, this.ctx.currentTime + 0.05);
            gain.gain.setValueAtTime(g, this.ctx.currentTime + duration - 0.1);
            gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start();
            osc.stop(this.ctx.currentTime + duration);
        };

        createOsc(120, 'sawtooth', 0.3);
        createOsc(60, 'square', 0.25); 

        noiseSource.start();
        noiseSource.stop(this.ctx.currentTime + duration);
    }

    public playDash() {
        // Pitch-shifting whoosh
        const bufferSize = this.ctx.sampleRate * 0.3;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

        const source = this.ctx.createBufferSource();
        source.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(400, this.ctx.currentTime);
        filter.frequency.exponentialRampToValueAtTime(4000, this.ctx.currentTime + 0.3);

        const gain = this.createGain(0.5, 0.0001, 0.3);
        source.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        source.start();
        source.stop(this.ctx.currentTime + 0.3);
    }

    public playHook() {
        // Electrical charge up + fire
        const osc = this.ctx.createOscillator();
        const gain = this.createGain(0.4, 0.0001, 0.4);
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(200, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, this.ctx.currentTime + 0.1);
        osc.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.4);
        
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(2000, this.ctx.currentTime);
        
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);
        
        osc.start();
        osc.stop(this.ctx.currentTime + 0.4);
    }

    public playMagnet() {
        const osc = this.ctx.createOscillator();
        const gain = this.createGain(0.3, 0.0001, 1.0);
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, this.ctx.currentTime);
        // Vibrato/Wobble for magnetic feel
        const lfo = this.ctx.createOscillator();
        const lfoGain = this.ctx.createGain();
        lfo.frequency.setValueAtTime(10, this.ctx.currentTime);
        lfoGain.gain.setValueAtTime(50, this.ctx.currentTime);
        
        lfo.connect(lfoGain);
        lfoGain.connect(osc.frequency);
        
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        
        lfo.start();
        osc.start();
        osc.stop(this.ctx.currentTime + 1.0);
        lfo.stop(this.ctx.currentTime + 1.0);
    }

    public playVortex() {
        const duration = 2.0;
        const bufferSize = this.ctx.sampleRate * duration;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

        const source = this.ctx.createBufferSource();
        source.buffer = buffer;
        source.loop = true;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(400, this.ctx.currentTime);
        
        // Swirling effect with LFO on filter
        const lfo = this.ctx.createOscillator();
        const lfoGain = this.ctx.createGain();
        lfo.frequency.setValueAtTime(2, this.ctx.currentTime);
        lfoGain.gain.setValueAtTime(300, this.ctx.currentTime);
        lfo.connect(lfoGain);
        lfoGain.connect(filter.frequency);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.4, this.ctx.currentTime + 0.5);
        gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + duration);

        source.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        lfo.start();
        source.start();
        source.stop(this.ctx.currentTime + duration);
        lfo.stop(this.ctx.currentTime + duration);
    }

    public playSpin() {
        const osc = this.ctx.createOscillator();
        const gain = this.createGain(0.3, 0.0001, 0.5);
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(200, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(2000, this.ctx.currentTime + 0.5);
        
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        
        osc.start();
        osc.stop(this.ctx.currentTime + 0.5);
    }

    public playAlert() {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
        gain.gain.setValueAtTime(0.2, this.ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0, this.ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.2, this.ctx.currentTime + 0.3);
        gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.6);

        osc.type = 'square';
        osc.frequency.setValueAtTime(440, this.ctx.currentTime);
        osc.frequency.setValueAtTime(220, this.ctx.currentTime + 0.3);
        
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.6);
    }

    public playRumble(duration: number, volume: number = 0.5) {
        const bufferSize = this.ctx.sampleRate * duration;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        
        // Use Brownian noise (filtered randomness) for deeper rumble
        let lastOut = 0;
        for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            data[i] = (lastOut + (0.02 * white)) / 1.02;
            lastOut = data[i];
            data[i] *= 3.5; // Amplify for lower volume signals
        }

        const source = this.ctx.createBufferSource();
        source.buffer = buffer;

        const lowpass = this.ctx.createBiquadFilter();
        lowpass.type = 'lowpass';
        lowpass.frequency.setValueAtTime(150, this.ctx.currentTime);
        lowpass.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + duration);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(volume, this.ctx.currentTime + 0.05);
        gain.gain.setValueAtTime(volume, this.ctx.currentTime + duration - 0.1);
        gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);

        source.connect(lowpass);
        lowpass.connect(gain);
        gain.connect(this.ctx.destination);

        source.start();
        source.stop(this.ctx.currentTime + duration);
    }

    public startBGM() {
        if (this.isBgmPlaying) return;
        this.isBgmPlaying = true;
        
        this.bgmMasterGain = this.ctx.createGain();
        this.bgmMasterGain.gain.setValueAtTime(0, this.ctx.currentTime);
        this.bgmMasterGain.gain.linearRampToValueAtTime(0.3, this.ctx.currentTime + 2.0); // Fade in
        this.bgmMasterGain.connect(this.ctx.destination);

        const tempo = 120;
        const stepDuration = 60 / tempo / 2; // 8th notes

        this.bgmStep = 0;
        this.bgmInterval = setInterval(() => {
            if (this.ctx.state === 'suspended') this.ctx.resume();
            this.scheduleBGMStep(this.ctx.currentTime + 0.1);
            this.bgmStep = (this.bgmStep + 1) % 16;
        }, stepDuration * 1000);
    }

    public stopBGM() {
        if (this.bgmInterval) {
            clearInterval(this.bgmInterval);
            this.bgmInterval = null;
        }
        if (this.bgmMasterGain) {
            this.bgmMasterGain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 1.0);
            const g = this.bgmMasterGain;
            setTimeout(() => g.disconnect(), 1000);
            this.bgmMasterGain = null;
        }
        this.isBgmPlaying = false;
    }

    private scheduleBGMStep(time: number) {
        if (!this.bgmMasterGain) return;

        // Bass pattern: A-A-G-C
        const bassNotes = [55, 55, 55, 55, 48, 48, 48, 48, 65, 65, 65, 65, 60, 60, 60, 60];
        if (this.bgmStep % 2 === 0) {
            this.playSynthNote(bassNotes[this.bgmStep], 'sawtooth', 0.15, time, 0.2);
        }

        // Melody: Spacey Arpeggio
        const melody = [null, 1100, null, 1300, 900, null, 1500, null];
        const mNote = melody[this.bgmStep % 8];
        if (mNote) {
            this.playSynthNote(mNote, 'square', 0.05, time, 0.4, true);
        }

        // Kick drum (procedural)
        if (this.bgmStep % 4 === 0) {
            this.playKick(time);
        }
    }

    private playSynthNote(freq: number, type: OscillatorType, volume: number, time: number, duration: number, isMelody: boolean = false) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, time);
        
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(isMelody ? 2000 : 400, time);
        filter.frequency.exponentialRampToValueAtTime(100, time + duration);

        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(volume, time + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.bgmMasterGain!);

        osc.start(time);
        osc.stop(time + duration);
    }

    private playKick(time: number) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.frequency.setValueAtTime(150, time);
        osc.frequency.exponentialRampToValueAtTime(0.001, time + 0.2);
        
        gain.gain.setValueAtTime(0.4, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.2);
        
        osc.connect(gain);
        gain.connect(this.bgmMasterGain!);
        
        osc.start(time);
        osc.stop(time + 0.2);
    }
}

export const soundSynth = new AudioSynth();
