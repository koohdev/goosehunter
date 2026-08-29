class AudioManager {
  private audioCtx: AudioContext | null = null;
  private buffers: Map<string, AudioBuffer> = new Map();
  private activeSources: Map<string, AudioBufferSourceNode> = new Map();
  private lastPlayedAt: Map<string, number> = new Map();
  private enabled: boolean = true;
  private bgmAudio: HTMLAudioElement | null = null;
  private bgmStarted: boolean = false;

  constructor() {
    // Lazy initialization
  }

  public getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.audioCtx) {
      const AudioCtxClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtxClass) {
        this.audioCtx = new AudioCtxClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
    return this.audioCtx;
  }

  public resumeContext() {
    const ctx = this.getContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    if (this.enabled && this.bgmStarted && this.bgmAudio && this.bgmAudio.paused) {
      this.bgmAudio.play().catch(() => {});
    }
  }

  public setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (!enabled) {
      this.stopAll();
      if (this.bgmAudio) {
        this.bgmAudio.pause();
      }
    } else {
      this.resumeContext();
      if (this.bgmStarted && this.bgmAudio) {
        this.bgmAudio.play().catch(() => {});
      }
    }
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public startBgm() {
    this.bgmStarted = true;
    if (typeof window === 'undefined') return;

    if (!this.bgmAudio) {
      this.bgmAudio = new Audio('/sounds/Powerup.mp3');
      this.bgmAudio.loop = true;
      this.bgmAudio.volume = 0.35;
    }

    if (this.enabled) {
      this.bgmAudio.play().catch(() => {
        // Autoplay policy waiting for user interaction
      });
    }
  }

  public stopBgm() {
    this.bgmStarted = false;
    if (this.bgmAudio) {
      this.bgmAudio.pause();
      this.bgmAudio.currentTime = 0;
    }
  }

  public stopAll() {
    this.activeSources.forEach((source) => {
      try {
        source.stop();
        source.disconnect();
      } catch {
        // Ignored
      }
    });
    this.activeSources.clear();
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
      { name: 'bgm', url: '/sounds/NightShade.mp3' },
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
        // Fallback to synthesis
      }
    }
  }

  public playSound(name: 'gunshot' | 'hit' | 'miss' | 'powerup' | 'win' | 'gameover' | 'click' | 'start') {
    if (!this.enabled) return;
    this.resumeContext();
    const ctx = this.getContext();
    if (!ctx) return;

    const now = Date.now();
    const lastTime = this.lastPlayedAt.get(name) || 0;

    // Prevent duplicate rapid triggers for level-up/win/gameover sounds
    if ((name === 'win' || name === 'powerup' || name === 'gameover' || name === 'start') && now - lastTime < 1000) {
      return;
    }
    this.lastPlayedAt.set(name, now);

    let bufferKey: string = name;
    if (name === 'hit') bufferKey = 'beng';
    if (name === 'win') bufferKey = 'powerup';
    if (name === 'miss') bufferKey = 'bullet';

    // Stop any existing instance of this specific sound so it never doubles
    const existingSource = this.activeSources.get(bufferKey);
    if (existingSource) {
      try {
        existingSource.stop();
        existingSource.disconnect();
      } catch {
        // Ignored
      }
      this.activeSources.delete(bufferKey);
    }

    const buffer = this.buffers.get(bufferKey);
    if (buffer) {
      try {
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        const gainNode = ctx.createGain();
        gainNode.gain.value = name === 'gunshot' ? 0.6 : name === 'start' ? 0.4 : 0.45;
        source.connect(gainNode);
        gainNode.connect(ctx.destination);

        source.onended = () => {
          this.activeSources.delete(bufferKey);
        };

        this.activeSources.set(bufferKey, source);
        source.start(0);
        return;
      } catch {
        // Fallback to synth
      }
    }

    // Fallback synthesizer
    this.synthesizeSound(name, ctx);
  }

  private synthesizeSound(name: string, ctx: AudioContext) {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    if (name === 'gunshot') {
      const bufferSize = ctx.sampleRate * 0.12;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
      const whiteNoise = ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(600, now);
      filter.frequency.exponentialRampToValueAtTime(40, now + 0.12);

      gain.gain.setValueAtTime(0.6, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

      whiteNoise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      whiteNoise.start(now);
    } else if (name === 'hit') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(280, now);
      osc.frequency.exponentialRampToValueAtTime(650, now + 0.08);
      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.08);
    } else if (name === 'powerup' || name === 'win') {
      const notes = [440, 554, 659, 880];
      notes.forEach((freq, idx) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'square';
        o.frequency.value = freq;
        g.gain.setValueAtTime(0.15, now + idx * 0.07);
        g.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.18);
        o.connect(g);
        g.connect(ctx.destination);
        o.start(now + idx * 0.07);
        o.stop(now + idx * 0.07 + 0.2);
      });
    } else if (name === 'gameover') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(50, now + 0.35);
      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.35);
    } else if (name === 'start') {
      const notes = [330, 440, 554, 659];
      notes.forEach((freq, idx) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'triangle';
        o.frequency.value = freq;
        g.gain.setValueAtTime(0.2, now + idx * 0.08);
        g.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.15);
        o.connect(g);
        g.connect(ctx.destination);
        o.start(now + idx * 0.08);
        o.stop(now + idx * 0.08 + 0.18);
      });
    } else if (name === 'click') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, now);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.03);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.04);
    }
  }
}

export const audioManager = new AudioManager();
