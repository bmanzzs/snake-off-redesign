// Web Audio API procedural sound synthesizer (offline, no external audio files)
class SoundManager {
  constructor() {
    this.ctx = null;
    this.initialized = false;
  }

  ensureContext() {
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

  playEat() {
    try {
      this.ensureContext();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      // Pleasant bright rising chirp: 520Hz -> 920Hz
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.exponentialRampToValueAtTime(920, now + 0.12);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.16);

      // Harmonious second harmonic sparkle
      const osc2 = this.ctx.createOscillator();
      const gain2 = this.ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(1040, now);
      osc2.frequency.exponentialRampToValueAtTime(1840, now + 0.14);

      gain2.gain.setValueAtTime(0.12, now);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

      osc2.connect(gain2);
      gain2.connect(this.ctx.destination);

      osc2.start(now);
      osc2.stop(now + 0.14);
    } catch (e) {
      // Audio playback fails gracefully if muted or blocked
    }
  }

  playCrash() {
    try {
      this.ensureContext();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;

      // Low dramatic boom
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.35);

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.35);
    } catch (e) {
      // Audio graceful fallback
    }
  }

  playTurn() {
    try {
      this.ensureContext();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(600, now + 0.04);

      gain.gain.setValueAtTime(0.04, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.04);
    } catch (e) {
      // Audio graceful fallback
    }
  }
}

export const sound = new SoundManager();
