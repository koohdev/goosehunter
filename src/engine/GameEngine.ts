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

interface ShellCasing {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  vRot: number;
  alpha: number;
  bounces: number;
}

interface SmokeParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
  life: number;
  maxLife: number;
}

export class GameEngine {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private gooseManager: GooseManager;
  private levelManager: LevelManager;
  private isRunning: boolean = false;
  private animFrameId: number | null = null;
  private lastTime: number = 0;

  // Crosshair state (pixel coordinates within canvas 800x570)
  private aimX: number = 400;
  private aimY: number = 300;

  // Shotgun state & physics
  private recoilY: number = 0;
  private recoilRot: number = 0;
  private muzzleFlashTimer: number = 0;
  private readonly maxFlashDuration: number = 0.085;

  // Visual effects
  private floatingTexts: FloatingText[] = [];
  private sparks: SparkParticle[] = [];
  private shells: ShellCasing[] = [];
  private smoke: SmokeParticle[] = [];

  // Assets
  private bgImage: HTMLImageElement | null = null;
  private bgCache: Map<string, HTMLImageElement> = new Map();
  private crosshairImage: HTMLImageElement | null = null;
  private shotgunImage: HTMLImageElement | null = null;
  private shotgunFireImage: HTMLImageElement | null = null;
  private flashImage: HTMLImageElement | null = null;
  private shellImage: HTMLImageElement | null = null;

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
      '/images/arcade-bg-marsh-day.png',
      '/images/arcade-bg-marsh-dusk.png',
      '/images/arcade-bg-marsh-snow.png',
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

    // Crosshair
    this.crosshairImage = new Image();
    this.crosshairImage.src = '/images/crosshair062.png';

    // Shotgun weapon sprites (Idle & Firing frames)
    this.shotgunImage = new Image();
    this.shotgunImage.src = '/images/shotgun-fps-idle.png';

    this.shotgunFireImage = new Image();
    this.shotgunFireImage.src = '/images/shotgun-fps-fire.png';

    // Muzzle blast flash sprite
    this.flashImage = new Image();
    this.flashImage.src = '/images/shotgun-flash-main.png';

    // Shotgun shell casing sprite
    this.shellImage = new Image();
    this.shellImage.src = '/images/shotgun-shell.png';

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
    this.shells = [];
    this.smoke = [];
    this.recoilY = 0;
    this.recoilRot = 0;
    this.muzzleFlashTimer = 0;
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
    // Gun cooldown guard (prevents duplicate rapid trigger events within 110ms)
    if (now - this.lastShotTime < 110) {
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

    // 1. Trigger dynamic shotgun recoil & flash
    this.recoilY = 32;
    this.recoilRot = -0.07;
    this.muzzleFlashTimer = this.maxFlashDuration;

    // 2. Play gunshot sound
    audioManager.playSound('gunshot');

    // 3. Compute shotgun geometry for shell eject & muzzle tip effects
    const gunBaseX = 400 + (this.aimX - 400) * 0.28;
    const gunBaseY = this.canvas.height + 35;
    const dx = this.aimX - gunBaseX;
    const dy = this.aimY - (gunBaseY - 140);
    const rawAngle = Math.atan2(dx, -dy);
    const gunAngle = Math.max(-0.60, Math.min(0.60, rawAngle));

    const tipDist = 250;
    const tipX = gunBaseX + Math.sin(gunAngle) * tipDist;
    const tipY = gunBaseY - Math.cos(gunAngle) * tipDist;

    // 4. Eject shotgun shell casing
    const chamberX = gunBaseX + Math.sin(gunAngle) * 90 + Math.cos(gunAngle) * 22;
    const chamberY = gunBaseY - Math.cos(gunAngle) * 90 + Math.sin(gunAngle) * 22;
    this.shells.push({
      x: chamberX,
      y: chamberY,
      vx: 5.0 + Math.random() * 3.0,
      vy: -6.5 - Math.random() * 2.5,
      rotation: Math.random() * Math.PI,
      vRot: (Math.random() * 12 + 8) * (Math.random() > 0.5 ? 1 : -1),
      alpha: 1,
      bounces: 0,
    });

    // 5. Spawn barrel muzzle smoke puffs
    for (let i = 0; i < 4; i++) {
      this.smoke.push({
        x: tipX + (Math.random() - 0.5) * 12,
        y: tipY + (Math.random() - 0.5) * 12,
        vx: Math.sin(gunAngle) * (Math.random() * 2 + 1) + (Math.random() - 0.5) * 1.5,
        vy: -Math.cos(gunAngle) * (Math.random() * 2 + 1) - (Math.random() * 1.5 + 1),
        radius: 8 + Math.random() * 6,
        alpha: 0.5,
        life: 0,
        maxLife: 0.7 + Math.random() * 0.35,
      });
    }

    // 6. Spawn fiery muzzle blast sparks towards aim
    this.spawnImpactSparks(this.aimX, this.aimY, tipX, tipY, gunAngle);

    // 7. Hit test against flying geese
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

  private spawnImpactSparks(targetX: number, targetY: number, muzzleX: number, muzzleY: number, gunAngle: number) {
    // Tracer sparks along shot path
    for (let i = 0; i < 8; i++) {
      const spread = (Math.random() - 0.5) * 0.15;
      const angle = gunAngle - Math.PI / 2 + spread;
      const speed = Math.random() * 6 + 3;
      this.sparks.push({
        x: muzzleX,
        y: muzzleY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: Math.random() > 0.3 ? '#fef08a' : '#f97316',
        alpha: 1,
        radius: Math.random() * 2.5 + 1.2,
      });
    }

    // Impact sparks at crosshair
    for (let i = 0; i < 14; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 5 + 2;
      this.sparks.push({
        x: targetX,
        y: targetY,
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

    // 1. Update geese physics & flight paths
    if (state.status === 'PLAYING') {
      this.gooseManager.update(deltaTime, this.canvas.width, this.canvas.height, config);
    }

    // 2. Shotgun recoil recovery spring physics
    this.recoilY *= Math.exp(-14 * deltaTime);
    this.recoilRot *= Math.exp(-16 * deltaTime);
    if (Math.abs(this.recoilY) < 0.2) this.recoilY = 0;
    if (Math.abs(this.recoilRot) < 0.002) this.recoilRot = 0;

    // 3. Muzzle flash timer
    if (this.muzzleFlashTimer > 0) {
      this.muzzleFlashTimer -= deltaTime;
      if (this.muzzleFlashTimer < 0) this.muzzleFlashTimer = 0;
    }

    // 4. Update ejected shells
    for (let i = this.shells.length - 1; i >= 0; i--) {
      const s = this.shells[i];
      s.x += s.vx * deltaTime * 60;
      s.y += s.vy * deltaTime * 60;
      s.vy += 18 * deltaTime; // gravity
      s.rotation += s.vRot * deltaTime;

      // Bounce once off bottom
      if (s.y > this.canvas.height - 25 && s.bounces === 0) {
        s.y = this.canvas.height - 25;
        s.vy = -s.vy * 0.45;
        s.vx *= 0.6;
        s.vRot *= 0.5;
        s.bounces += 1;
      }

      s.alpha -= 0.65 * deltaTime;
      if (s.alpha <= 0 || s.y > this.canvas.height + 40) {
        this.shells.splice(i, 1);
      }
    }

    // 5. Update barrel smoke particles
    for (let i = this.smoke.length - 1; i >= 0; i--) {
      const sm = this.smoke[i];
      sm.life += deltaTime;
      if (sm.life >= sm.maxLife) {
        this.smoke.splice(i, 1);
        continue;
      }
      sm.x += sm.vx * deltaTime * 60;
      sm.y += sm.vy * deltaTime * 60;
      sm.radius += 14 * deltaTime;
      sm.alpha = Math.max(0, (1 - sm.life / sm.maxLife) * 0.45);
    }

    // 6. Update floating point texts
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.y -= 40 * deltaTime;
      ft.alpha -= 0.8 * deltaTime;
      if (ft.alpha <= 0) {
        this.floatingTexts.splice(i, 1);
      }
    }

    // 7. Update sparks
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

    // 1. Render Background Image / Gradient
    if (this.bgImage && this.bgImage.complete && this.bgImage.naturalWidth > 0) {
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(this.bgImage, 0, 0, w, h);
    } else {
      this.drawProceduralBackground(ctx, w, h);
    }

    // 2. Render Animated Geese & Feathers
    this.gooseManager.render(ctx);

    // 3. Render Sparks & Impact Particles
    for (const s of this.sparks) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, s.alpha);
      ctx.fillStyle = s.color;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 4. Render Ejected Shotgun Shell Casings
    for (const shell of this.shells) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, shell.alpha);
      ctx.translate(shell.x, shell.y);
      ctx.rotate(shell.rotation);

      if (this.shellImage && this.shellImage.complete && this.shellImage.naturalWidth > 0) {
        const sw = 22;
        const sh = 22;
        ctx.drawImage(this.shellImage, -sw / 2, -sh / 2, sw, sh);
      } else {
        ctx.fillStyle = '#dc2626';
        ctx.fillRect(-8, -4, 16, 8);
        ctx.fillStyle = '#eab308';
        ctx.fillRect(-8, -4, 4, 8);
      }
      ctx.restore();
    }

    // 5. Render Barrel Smoke Puffs
    for (const sm of this.smoke) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, sm.alpha);
      ctx.fillStyle = '#d4d4d8';
      ctx.beginPath();
      ctx.arc(sm.x, sm.y, sm.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 6. Render First-Person Shotgun & Muzzle Blast
    this.drawShotgun(ctx, w, h);

    // 7. Render Floating Score Indicators
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

    // 8. Render Screen Flash on Shot
    if (this.muzzleFlashTimer > 0) {
      const flashRatio = this.muzzleFlashTimer / this.maxFlashDuration;
      ctx.save();
      ctx.fillStyle = `rgba(255, 255, 220, ${0.35 * flashRatio})`;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }

    // 9. Render Crosshair Reticle
    this.drawCrosshair(ctx, this.aimX, this.aimY);
  }

  private drawShotgun(ctx: CanvasRenderingContext2D, w: number, h: number) {
    // Shotgun base pivot position with horizontal sway tracking the aim
    const gunBaseX = w / 2 + (this.aimX - w / 2) * 0.28;
    const gunBaseY = h + 30 + this.recoilY;

    // Angle towards aim position
    const dx = this.aimX - gunBaseX;
    const dy = this.aimY - (gunBaseY - 140);
    const rawAngle = Math.atan2(dx, -dy);
    const gunAngle = Math.max(-0.60, Math.min(0.60, rawAngle)) + this.recoilRot;

    // Render Single-Barrel Gun Sprite (600x700 natural aspect ratio)
    const dw = 270;
    const dh = 315;

    ctx.save();
    ctx.translate(gunBaseX, gunBaseY);
    ctx.rotate(gunAngle);

    const activeGunImg = (this.muzzleFlashTimer > 0 && this.shotgunFireImage && this.shotgunFireImage.complete)
      ? this.shotgunFireImage
      : this.shotgunImage;

    if (activeGunImg && activeGunImg.complete && activeGunImg.naturalWidth > 0) {
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(activeGunImg, -dw / 2, -dh, dw, dh);
    } else {
      // Procedural Shotgun Fallback
      this.drawProceduralShotgun(ctx, dw, dh);
    }
    ctx.restore();

    // Render Muzzle Flash at barrel tip (Tip is at X=300, Y=40 in 600x700 sprite => tipDist = dh * (660/700))
    if (this.muzzleFlashTimer > 0) {
      const tipDist = (dh * (660 / 700)) - this.recoilY * 0.4;
      const tipX = gunBaseX + Math.sin(gunAngle) * tipDist;
      const tipY = gunBaseY - Math.cos(gunAngle) * tipDist;

      ctx.save();
      ctx.translate(tipX, tipY);
      ctx.rotate(gunAngle);

      // Radial bright core glow
      const flashGrad = ctx.createRadialGradient(0, 0, 8, 0, 0, 85);
      flashGrad.addColorStop(0, 'rgba(255, 255, 200, 0.95)');
      flashGrad.addColorStop(0.35, 'rgba(255, 170, 40, 0.7)');
      flashGrad.addColorStop(1, 'rgba(255, 80, 0, 0)');
      ctx.fillStyle = flashGrad;
      ctx.beginPath();
      ctx.arc(0, 0, 85, 0, Math.PI * 2);
      ctx.fill();

      // Muzzle Flash Sprite Burst
      if (this.flashImage && this.flashImage.complete && this.flashImage.naturalWidth > 0) {
        const fw = 140;
        const fh = 240;
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(this.flashImage, -fw / 2, -fh, fw, fh);
      }
      ctx.restore();
    }
  }

  private drawProceduralShotgun(ctx: CanvasRenderingContext2D, dw: number, dh: number) {
    // Barrels
    ctx.fillStyle = '#3f3f46';
    ctx.fillRect(-18, -dh, 36, dh - 80);

    ctx.fillStyle = '#71717a';
    ctx.fillRect(-14, -dh, 12, dh - 80);
    ctx.fillRect(2, -dh, 12, dh - 80);

    // Barrel rib
    ctx.fillStyle = '#18181b';
    ctx.fillRect(-2, -dh, 4, dh - 80);

    // Stock & Grip
    ctx.fillStyle = '#78350f';
    ctx.beginPath();
    ctx.moveTo(-24, -80);
    ctx.lineTo(24, -80);
    ctx.lineTo(36, 0);
    ctx.lineTo(-36, 0);
    ctx.closePath();
    ctx.fill();
  }

  private drawProceduralBackground(ctx: CanvasRenderingContext2D, w: number, h: number) {
    const skyGradient = ctx.createLinearGradient(0, 0, 0, h - 140);
    skyGradient.addColorStop(0, '#38bdf8');
    skyGradient.addColorStop(1, '#bae6fd');
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, w, h - 140);

    const groundY = h - 90;
    ctx.fillStyle = '#854d0e';
    ctx.fillRect(0, groundY, w, 90);
    ctx.fillStyle = '#166534';
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
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2.5;

    // Outer circle
    ctx.beginPath();
    ctx.arc(x, y, 20, 0, Math.PI * 2);
    ctx.stroke();

    // Center dot
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
