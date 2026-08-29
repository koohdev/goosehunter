class AudioManager {
  private audioCtx: AudioContext | null = null;
  private buffers: Map<string, AudioBuffer> = new Map();
  private enabled: boolean = true;
  private bgmAudio: HTMLAudioElement | null = null;

  constructor() {
    // Lazy init audio context on first user interaction
  }

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.audioCtx) {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtxClass) {
        this.audioCtx = new AudioCtxClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  public setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (!enabled && this.bgmAudio) {
      this.bgmAudio.pause();
    }
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public async preloadSounds() {
    if (typeof window === 'undefined') return;
    const soundList: { name: string; url: string }[] = [
      { name: 'gunshot', url: '/sounds/gunshot.mp3' },
      { name: 'beng', url: '/sounds/Beng.MP3' },
      { name: 'bullet', url: '/sounds/bullet_shot.wav' },
      { name: 'click', url: '/sounds/Click.wav' },
      { name: 'powerup', url: '/sounds/Powerup.mp3' },
      { name: 'start', url: '/sounds/START.mp3' },
    ];

    const ctx = this.getContext();
    if (!ctx) return;

    for (const item of soundList) {
      try {
        const response = await fetch(item.url);
        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer();
          const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
          this.buffers.set(item.name, audioBuffer);
        }
      } catch {
        // Fallback to synthesis if file decoding fails
      }
    }
  }

  public playSound(name: 'gunshot' | 'hit' | 'miss' | 'powerup' | 'win' | 'gameover' | 'click') {
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    // Check if preloaded buffer exists
    let bufferKey: string = name;
    if (name === 'hit') bufferKey = 'beng';
    if (name === 'win') bufferKey = 'powerup';
    if (name === 'miss') bufferKey = 'bullet';

    const buffer = this.buffers.get(bufferKey);
    if (buffer) {
      try {
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        const gainNode = ctx.createGain();
        gainNode.gain.value = name === 'gunshot' ? 0.7 : 0.5;
        source.connect(gainNode);
        gainNode.connect(ctx.destination);
        source.start(0);
        return;
      } catch {
        // Fallback to synth
      }
    }

    // Synthesizer fallback for retro 8-bit sound fx
    this.synthesizeSound(name, ctx);
  }

  private synthesizeSound(name: string, ctx: AudioContext) {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    if (name === 'gunshot') {
      // Noise burst + low kick
      const bufferSize = ctx.sampleRate * 0.15;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
      const whiteNoise = ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, now);
      filter.frequency.exponentialRampToValueAtTime(50, now + 0.15);

      gain.gain.setValueAtTime(0.8, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

      whiteNoise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      whiteNoise.start(now);
    } else if (name === 'hit') {
      // Arcade chirp/hit
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.1);
      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.1);
    } else if (name === 'powerup' || name === 'win') {
      // Fanfare arpeggio
      const notes = [440, 554, 659, 880];
      notes.forEach((freq, idx) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'square';
        o.frequency.value = freq;
        g.gain.setValueAtTime(0.2, now + idx * 0.08);
        g.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.2);
        o.connect(g);
        g.connect(ctx.destination);
        o.start(now + idx * 0.08);
        o.stop(now + idx * 0.08 + 0.25);
      });
    } else if (name === 'gameover') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(250, now);
      osc.frequency.exponentialRampToValueAtTime(60, now + 0.4);
      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.4);
    } else if (name === 'click') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.04);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.05);
    }
  }
}

export const audioManager = new AudioManager();
