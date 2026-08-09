/**
 * Super Pixel Mario - Web Audio Synthesizer Engine
 * Generates self-contained 8-bit retro sound effects and background music
 */

class SoundEngine {
    constructor() {
        this.ctx = null;
        this.muted = false;
        this.musicPlaying = false;
        this.musicTimer = null;
        this.noteIndex = 0;

        // Classic Mario theme notes setup (Frequency, Duration)
        // E5, E5, 0, E5, 0, C5, E5, 0, G5, 0, 0, 0, G4
        this.melody = [
            { f: 659.25, d: 0.15 }, { f: 659.25, d: 0.15 }, { f: 0, d: 0.15 }, { f: 659.25, d: 0.15 },
            { f: 0, d: 0.15 }, { f: 523.25, d: 0.15 }, { f: 659.25, d: 0.15 }, { f: 0, d: 0.15 },
            { f: 783.99, d: 0.30 }, { f: 0, d: 0.30 }, { f: 392.00, d: 0.30 }, { f: 0, d: 0.30 },
            
            { f: 523.25, d: 0.25 }, { f: 0, d: 0.15 }, { f: 392.00, d: 0.25 }, { f: 0, d: 0.15 },
            { f: 329.63, d: 0.25 }, { f: 0, d: 0.15 }, { f: 440.00, d: 0.20 }, { f: 493.88, d: 0.20 },
            { f: 466.16, d: 0.15 }, { f: 440.00, d: 0.25 }, { f: 392.00, d: 0.20 }, { f: 659.25, d: 0.20 },
            { f: 783.99, d: 0.20 }, { f: 880.00, d: 0.25 }, { f: 698.46, d: 0.15 }, { f: 783.99, d: 0.20 },
            { f: 0, d: 0.10 }, { f: 659.25, d: 0.20 }, { f: 523.25, d: 0.15 }, { f: 587.33, d: 0.15 },
            { f: 493.88, d: 0.25 }, { f: 0, d: 0.30 }
        ];
    }

    init() {
        if (!this.ctx) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (AudioCtx) {
                this.ctx = new AudioCtx();
            }
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    playTone(freq, duration, type = 'square', startGain = 0.2, endGain = 0.001) {
        if (this.muted || !this.ctx) return;
        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            
            osc.type = type;
            osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
            
            gain.gain.setValueAtTime(startGain, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(endGain, this.ctx.currentTime + duration);
            
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            
            osc.start();
            osc.stop(this.ctx.currentTime + duration);
        } catch (e) {
            // Audio context error fallback
        }
    }

    playJump() {
        if (this.muted || !this.ctx) return;
        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            
            osc.type = 'square';
            const now = this.ctx.currentTime;
            osc.frequency.setValueAtTime(150, now);
            osc.frequency.exponentialRampToValueAtTime(600, now + 0.18);
            
            gain.gain.setValueAtTime(0.25, now);
            gain.gain.linearRampToValueAtTime(0.01, now + 0.18);
            
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            
            osc.start(now);
            osc.stop(now + 0.18);
        } catch (e) {}
    }

    playCoin() {
        if (this.muted || !this.ctx) return;
        try {
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            
            osc.type = 'sine';
            osc.frequency.setValueAtTime(987.77, now); // B5
            osc.frequency.setValueAtTime(1318.51, now + 0.08); // E6
            
            gain.gain.setValueAtTime(0.3, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
            
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            
            osc.start(now);
            osc.stop(now + 0.35);
        } catch (e) {}
    }

    playBuySound() {
        if (this.muted || !this.ctx) return;
        this.playTone(523.25, 0.08, 'square', 0.2); // C5
        setTimeout(() => this.playTone(659.25, 0.08, 'square', 0.2), 60); // E5
        setTimeout(() => this.playTone(783.99, 0.12, 'square', 0.25), 120); // G5
    }

    playPowerUp() {
        if (this.muted || !this.ctx) return;
        const notes = [330, 392, 659, 523, 587, 784];
        notes.forEach((freq, idx) => {
            setTimeout(() => {
                this.playTone(freq, 0.08, 'square', 0.2);
            }, idx * 60);
        });
    }

    playStomp() {
        if (this.muted || !this.ctx) return;
        try {
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(140, now);
            osc.frequency.exponentialRampToValueAtTime(30, now + 0.12);
            
            gain.gain.setValueAtTime(0.3, now);
            gain.gain.linearRampToValueAtTime(0.01, now + 0.12);
            
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            
            osc.start(now);
            osc.stop(now + 0.12);
        } catch (e) {}
    }

    playBump() {
        this.playTone(110, 0.1, 'square', 0.25);
    }

    playBreak() {
        if (this.muted || !this.ctx) return;
        try {
            const bufferSize = this.ctx.sampleRate * 0.15;
            const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = Math.random() * 2 - 1;
            }
            
            const noise = this.ctx.createBufferSource();
            noise.buffer = buffer;
            const gain = this.ctx.createGain();
            
            gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);
            
            noise.connect(gain);
            gain.connect(this.ctx.destination);
            
            noise.start();
        } catch (e) {}
    }

    playDeath() {
        if (this.muted || !this.ctx) return;
        this.stopMusic();
        const notes = [500, 400, 300, 200, 150];
        notes.forEach((freq, idx) => {
            setTimeout(() => {
                this.playTone(freq, 0.12, 'sawtooth', 0.3);
            }, idx * 100);
        });
    }

    playVictory() {
        if (this.muted || !this.ctx) return;
        this.stopMusic();
        const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99];
        notes.forEach((freq, idx) => {
            setTimeout(() => {
                this.playTone(freq, 0.15, 'square', 0.25);
            }, idx * 100);
        });
    }

    startMusic() {
        if (this.musicPlaying || this.muted) return;
        this.init();
        this.musicPlaying = true;
        this.noteIndex = 0;
        this.scheduleNextNote();
    }

    scheduleNextNote() {
        if (!this.musicPlaying || this.muted) return;
        
        const note = this.melody[this.noteIndex];
        if (note.f > 0) {
            this.playTone(note.f, note.d * 0.8, 'square', 0.12);
        }
        
        this.noteIndex = (this.noteIndex + 1) % this.melody.length;
        this.musicTimer = setTimeout(() => {
            this.scheduleNextNote();
        }, note.d * 1000);
    }

    stopMusic() {
        this.musicPlaying = false;
        if (this.musicTimer) {
            clearTimeout(this.musicTimer);
            this.musicTimer = null;
        }
    }

    toggleMute() {
        this.muted = !this.muted;
        if (this.muted) {
            this.stopMusic();
        } else {
            this.startMusic();
        }
        return this.muted;
    }
}

// Global Sound Singleton
const AudioSystem = new SoundEngine();
