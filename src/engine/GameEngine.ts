import { GooseManager } from './GooseManager';
import { LevelManager } from './LevelManager';
import { audioManager } from './AudioManager';
import { GameRoundState, FireResult } from '@/lib/types';

interface FloatingText {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
  alpha: number;
  scale: number;
  createdAt: number;
}

interface SparkParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  alpha: number;
  radius: number;
}

export class GameEngine {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private gooseManager: GooseManager;
  private levelManager: LevelManager;
  private isRunning: boolean = false;
  private animFrameId: number | null = null;
  private lastTime: number = 0;

  // Crosshair state (pixel coordinates within canvas)
  private aimX: number = 400;
  private aimY: number = 300;
  private isMuzzleFlashing: boolean = false;
  private muzzleFlashTimer: number = 0;

  // Visual effects
  private floatingTexts: FloatingText[] = [];
  private sparks: SparkParticle[] = [];

  // Background image
  private bgImage: HTMLImageElement | null = null;
  private bgCache: Map<string, HTMLImageElement> = new Map();
  private crosshairImage: HTMLImageElement | null = null;

  // Callback
  private onStateChange: ((state: GameRoundState) => void) | null = null;

  constructor(levelManager: LevelManager) {
    this.levelManager = levelManager;
    this.gooseManager = new GooseManager();
    this.preloadBackgrounds();
  }

  private preloadBackgrounds() {
    if (typeof window === 'undefined') return;
    const bgList = [
      '/images/background.png',
      '/images/background-4.png',
      '/images/background-selection-4.png',
      '/images/background-6-selection4.png',
      '/images/background-selection.png',
    ];
    for (const src of bgList) {
      const img = new Image();
      img.src = src;
      this.bgCache.set(src, img);
    }
  }

  public init(canvas: HTMLCanvasElement, onStateChange: (state: GameRoundState) => void) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.onStateChange = onStateChange;

    this.aimX = canvas.width / 2;
    this.aimY = canvas.height / 2;

    this.loadAssets();
    this.start();
  }

  private loadAssets() {
    if (typeof window === 'undefined') return;

    // Preload crosshair
    this.crosshairImage = new Image();
    this.crosshairImage.src = '/images/crosshair062.png';

    this.updateBackground();
  }

  public updateBackground() {
    const config = this.levelManager.getCurrentConfig();
    const cached = this.bgCache.get(config.themeBackground);
    if (cached) {
      this.bgImage = cached;
    } else {
      const img = new Image();
      img.src = config.themeBackground;
      this.bgCache.set(config.themeBackground, img);
      this.bgImage = img;
    }
  }

  public start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  public pause() {
    this.isRunning = false;
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  public loadLevel(levelIndex: number) {
    this.levelManager.startRound(levelIndex);
    this.gooseManager.reset();
    this.floatingTexts = [];
    this.sparks = [];
    this.updateBackground();
    audioManager.resumeBgm();
    audioManager.playSound('start');
    this.notifyState();
  }

  public setNormalizedAim(normX: number, normY: number) {
    if (!this.canvas) return;

    // Map [-1.0, 1.0] to canvas pixel space with margins
    const margin = 20;
    const targetX = ((normX + 1) / 2) * this.canvas.width;
    const targetY = ((normY + 1) / 2) * this.canvas.height;

    // Clamp to canvas borders
    this.aimX = Math.max(margin, Math.min(this.canvas.width - margin, targetX));
    this.aimY = Math.max(margin, Math.min(this.canvas.height - margin, targetY));
  }

  public setPixelAim(x: number, y: number) {
    if (!this.canvas) return;
    this.aimX = Math.max(10, Math.min(this.canvas.width - 10, x));
    this.aimY = Math.max(10, Math.min(this.canvas.height - 10, y));
  }

  private lastShotTime: number = 0;

  public fireShot(): FireResult {
    if (!this.canvas) {
      return { hit: false, pointsAwarded: 0, bulletsRemaining: 0, x: 0, y: 0 };
    }

    const now = performance.now();
    // Gun cooldown guard (prevents duplicate rapid trigger events within 120ms)
    if (now - this.lastShotTime < 120) {
      const state = this.levelManager.getState();
      return {
        hit: false,
        pointsAwarded: 0,
        bulletsRemaining: state.bulletsRemaining,
        x: this.aimX,
        y: this.aimY,
      };
    }
    this.lastShotTime = now;

    const state = this.levelManager.getState();
    if (state.bulletsRemaining <= 0 || state.status !== 'PLAYING') {
      return {
        hit: false,
        pointsAwarded: 0,
        bulletsRemaining: state.bulletsRemaining,
        x: this.aimX,
        y: this.aimY,
      };
    }

    // Trigger visual muzzle flash
    this.isMuzzleFlashing = true;
    this.muzzleFlashTimer = 0.08;

    // Play gunshot sound
    audioManager.playSound('gunshot');

    // Spawn sparks at aim
    this.spawnImpactSparks(this.aimX, this.aimY);

    // Hit test against flying geese
    const { hit, goose } = this.gooseManager.checkHit(this.aimX, this.aimY);

    let points = 0;
    if (hit && goose) {
      points = goose.points;
      audioManager.playSound('hit');

      // Add floating score text
      const colors = { BLACK: '#4ade80', BLUE: '#60a5fa', RED: '#f87171' };
      this.floatingTexts.push({
        id: Math.random().toString(),
        text: `+${points}`,
        x: this.aimX,
        y: this.aimY - 20,
        color: colors[goose.type] || '#facc15',
        alpha: 1,
        scale: 1.4,
        createdAt: performance.now(),
      });
    }

    // Record shot in LevelManager
    const { roundFinished, won } = this.levelManager.recordShot(hit, points);

    if (roundFinished) {
      audioManager.playSound(won ? 'win' : 'gameover');
    }

    this.notifyState();

    return {
      hit,
      hitTargetId: goose?.id,
      pointsAwarded: points,
      bulletsRemaining: this.levelManager.getState().bulletsRemaining,
      gooseType: goose?.type,
      x: this.aimX,
      y: this.aimY,
    };
  }

  private spawnImpactSparks(x: number, y: number) {
    for (let i = 0; i < 14; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 5 + 2;
      this.sparks.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: Math.random() > 0.4 ? '#fef08a' : '#f97316',
        alpha: 1,
        radius: Math.random() * 3 + 1.5,
      });
    }
  }

  private loop = (currentTime: number) => {
    if (!this.isRunning) return;

    const deltaTime = Math.min(0.1, (currentTime - this.lastTime) / 1000);
    this.lastTime = currentTime;

    this.update(deltaTime);
    this.render();

    this.animFrameId = requestAnimationFrame(this.loop);
  };

  private update(deltaTime: number) {
    if (!this.canvas) return;

    const config = this.levelManager.getCurrentConfig();
    const state = this.levelManager.getState();

    // 1. Update geese physics & flight paths if in active round
    if (state.status === 'PLAYING') {
      this.gooseManager.update(deltaTime, this.canvas.width, this.canvas.height, config);
    }

    // 2. Update muzzle flash timer
    if (this.isMuzzleFlashing) {
      this.muzzleFlashTimer -= deltaTime;
      if (this.muzzleFlashTimer <= 0) {
        this.isMuzzleFlashing = false;
      }
    }

    // 3. Update floating point texts
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.y -= 40 * deltaTime;
      ft.alpha -= 0.8 * deltaTime;
      if (ft.alpha <= 0) {
        this.floatingTexts.splice(i, 1);
      }
    }

    // 4. Update sparks
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const s = this.sparks[i];
      s.x += s.vx * deltaTime * 60;
      s.y += s.vy * deltaTime * 60;
      s.vy += 4 * deltaTime; // gravity
      s.alpha -= 1.8 * deltaTime;
      if (s.alpha <= 0) {
        this.sparks.splice(i, 1);
      }
    }
  }

  private render() {
    if (!this.ctx || !this.canvas) return;
    const { ctx, canvas } = this;
    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    // 1. Render Layer: Background Image / Gradient
    if (this.bgImage && this.bgImage.complete && this.bgImage.naturalWidth > 0) {
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(this.bgImage, 0, 0, w, h);
    } else {
      // Procedural Retro Sky & Forest Fallback
      this.drawProceduralBackground(ctx, w, h);
    }

    // 2. Render Layer: Animated Geese
    this.gooseManager.render(ctx);

    // 3. Render Layer: Sparks & Particles
    for (const s of this.sparks) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, s.alpha);
      ctx.fillStyle = s.color;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 5. Render Layer: Floating Score Indicators
    for (const ft of this.floatingTexts) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, ft.alpha);
      ctx.font = 'bold 24px monospace';
      ctx.fillStyle = ft.color;
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 4;
      ctx.strokeText(ft.text, ft.x, ft.y);
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.restore();
    }

    // 6. Render Layer: Muzzle Flash
    if (this.isMuzzleFlashing) {
      ctx.save();
      ctx.fillStyle = 'rgba(255, 255, 230, 0.45)';
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }

    // 7. Render Layer: Crosshair Reticle
    this.drawCrosshair(ctx, this.aimX, this.aimY);
  }

  private drawProceduralBackground(ctx: CanvasRenderingContext2D, w: number, h: number) {
    const state = this.levelManager.getState();
    const isSnow = state.currentLevel === 1;

    // Sky
    const skyGradient = ctx.createLinearGradient(0, 0, 0, h - 140);
    skyGradient.addColorStop(0, isSnow ? '#7dd3fc' : '#38bdf8');
    skyGradient.addColorStop(1, isSnow ? '#e0f2fe' : '#bae6fd');
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, w, h - 140);

    // Clouds
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.beginPath();
    ctx.arc(140, 80, 40, 0, Math.PI * 2);
    ctx.arc(180, 70, 50, 0, Math.PI * 2);
    ctx.arc(230, 80, 40, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(w - 200, 110, 35, 0, Math.PI * 2);
    ctx.arc(w - 160, 100, 45, 0, Math.PI * 2);
    ctx.arc(w - 120, 110, 35, 0, Math.PI * 2);
    ctx.fill();

    this.drawForeground(ctx, w, h);
  }

  private drawForeground(ctx: CanvasRenderingContext2D, w: number, h: number) {
    const state = this.levelManager.getState();
    const isSnow = state.currentLevel === 1;

    // Ground line
    const groundY = h - 90;
    ctx.fillStyle = isSnow ? '#f1f5f9' : '#854d0e';
    ctx.fillRect(0, groundY, w, 90);

    // Grass/Dirt top stripe
    ctx.fillStyle = isSnow ? '#cbd5e1' : '#166534';
    ctx.fillRect(0, groundY - 12, w, 12);
  }

  private drawCrosshair(ctx: CanvasRenderingContext2D, x: number, y: number) {
    const size = 48;

    if (this.crosshairImage && this.crosshairImage.complete && this.crosshairImage.naturalWidth > 0) {
      ctx.save();
      ctx.drawImage(this.crosshairImage, x - size / 2, y - size / 2, size, size);
      ctx.restore();
      return;
    }

    // Procedural Arcade Crosshair Reticle
    ctx.save();
    ctx.strokeStyle = '#ef4444'; // Bright Red
    ctx.lineWidth = 2.5;

    // Outer circle
    ctx.beginPath();
    ctx.arc(x, y, 20, 0, Math.PI * 2);
    ctx.stroke();

    // Inner center dot
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fill();

    // Crosshairs lines
    ctx.beginPath();
    ctx.moveTo(x - 28, y);
    ctx.lineTo(x - 8, y);
    ctx.moveTo(x + 8, y);
    ctx.lineTo(x + 28, y);
    ctx.moveTo(x, y - 28);
    ctx.lineTo(x, y - 8);
    ctx.moveTo(x, y + 8);
    ctx.lineTo(x, y + 28);
    ctx.stroke();

    ctx.restore();
  }

  private notifyState() {
    if (this.onStateChange) {
      this.onStateChange(this.levelManager.getState());
    }
  }

  public destroy() {
    this.pause();
    this.canvas = null;
    this.ctx = null;
  }
}
