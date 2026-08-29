import { GooseTarget, LevelConfig } from '@/lib/types';

export interface FeatherParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  angularVelocity: number;
  scale: number;
  alpha: number;
  life: number;
  maxLife: number;
}

export class GooseManager {
  private geese: GooseTarget[] = [];
  private feathers: FeatherParticle[] = [];
  private sprites: Map<string, HTMLImageElement> = new Map();
  private lastSpawnTime: number = 0;

  constructor() {
    this.preloadSprites();
  }

  private preloadSprites() {
    if (typeof window === 'undefined') return;

    const spritePaths: { key: string; src: string }[] = [
      // Flying flapping frames
      { key: 'goose_black_1', src: '/images/goose-black-v2-1.png' },
      { key: 'goose_black_2', src: '/images/goose-black-v2-2.png' },
      { key: 'goose_blue_1', src: '/images/goose-blue-v2-1.png' },
      { key: 'goose_blue_2', src: '/images/goose-blue-v2-2.png' },
      { key: 'goose_red_1', src: '/images/goose-red-v2-1.png' },
      { key: 'goose_red_2', src: '/images/goose-red-v2-2.png' },
      
      // Hit & Dying frames (Black)
      { key: 'goose_black_hit', src: '/images/goose-hit-frame1.png' },
      { key: 'goose_black_fall_1', src: '/images/goose-falling-frame1.png' },
      { key: 'goose_black_fall_2', src: '/images/goose-falling-frame2.png' },

      // Hit & Dying frames (Blue)
      { key: 'goose_blue_hit', src: '/images/goose-blue-hit.png' },
      { key: 'goose_blue_fall_1', src: '/images/goose-blue-falling-1.png' },
      { key: 'goose_blue_fall_2', src: '/images/goose-blue-falling-2.png' },

      // Hit & Dying frames (Red)
      { key: 'goose_red_hit', src: '/images/goose-red-hit.png' },
      { key: 'goose_red_fall_1', src: '/images/goose-red-falling-1.png' },
      { key: 'goose_red_fall_2', src: '/images/goose-red-falling-2.png' },

      // VFX
      { key: 'goose_feather', src: '/images/goose-feather.png' },
    ];

    spritePaths.forEach(({ key, src }) => {
      const img = new Image();
      img.src = src;
      img.onload = () => this.sprites.set(key, img);
    });
  }

  public reset() {
    this.geese = [];
    this.feathers = [];
    this.lastSpawnTime = Date.now();
  }

  public getGeese(): GooseTarget[] {
    return this.geese;
  }

  public getFeathers(): FeatherParticle[] {
    return this.feathers;
  }

  public update(deltaTime: number, width: number, height: number, config: LevelConfig) {
    const now = Date.now();

    // 1. Check if we should spawn new geese
    const activeCount = this.geese.filter((g) => g.state === 'FLYING' || g.state === 'SPAWNING').length;
    if (activeCount < config.simultaneousGeese && now - this.lastSpawnTime > 1200) {
      this.spawnGoose(width, height, config);
      this.lastSpawnTime = now;
    }

    // 2. Update existing geese positions & animations
    for (let i = this.geese.length - 1; i >= 0; i--) {
      const goose = this.geese[i];

      if (goose.state === 'FLYING') {
        goose.x += goose.vx * deltaTime * 60;
        goose.y += goose.vy * deltaTime * 60;

        // Bounce horizontally on edges
        if (goose.x < 15) {
          goose.x = 15;
          goose.vx = Math.abs(goose.vx);
          goose.direction = 1;
        } else if (goose.x + goose.width > width - 15) {
          goose.x = width - 15 - goose.width;
          goose.vx = -Math.abs(goose.vx);
          goose.direction = -1;
        }

        // Top ceiling escape or bounce
        if (goose.y < 25) {
          goose.y = 25;
          goose.vy = Math.abs(goose.vy) * 0.85;
        }

        // Bottom floor bound
        if (goose.y > height - 170) {
          goose.y = height - 170;
          goose.vy = -Math.abs(goose.vy);
        }

        // Wing flapping animation timer
        goose.frameTimer += deltaTime;
        if (goose.frameTimer > 0.14) {
          goose.frameTimer = 0;
          goose.frameIndex = (goose.frameIndex + 1) % 2;
        }

        // Escape after duration
        goose.flightDuration += deltaTime;
        if (goose.flightDuration > 14) {
          goose.state = 'ESCAPED';
          goose.vy = -4.5;
        }
      } else if (goose.state === 'HIT') {
        // Pause briefly in shocked / dizzy state with wobble
        goose.frameTimer += deltaTime;
        if (goose.frameTimer > 0.28) {
          goose.state = 'FALLING';
          goose.frameIndex = 0;
          goose.frameTimer = 0;
          goose.vy = 2.5; // Begin fall
        }
      } else if (goose.state === 'FALLING') {
        // Accelerate downwards with gravity & tumbling animation
        goose.vy += 9.8 * deltaTime * 0.8;
        goose.y += goose.vy * deltaTime * 60;
        goose.x += goose.vx * 0.2 * deltaTime * 60; // slight drift

        // Cycle dying tumbling frames
        goose.frameTimer += deltaTime;
        if (goose.frameTimer > 0.12) {
          goose.frameTimer = 0;
          goose.frameIndex = (goose.frameIndex + 1) % 2;
        }

        // Occasionally shed a trailing feather while falling
        if (Math.random() < 0.12) {
          this.feathers.push({
            x: goose.x + goose.width / 2,
            y: goose.y + goose.height / 2,
            vx: (Math.random() - 0.5) * 1.5,
            vy: -1.0,
            angle: Math.random() * Math.PI * 2,
            angularVelocity: (Math.random() - 0.5) * 4,
            scale: Math.random() * 0.3 + 0.2,
            alpha: 0.9,
            life: 0,
            maxLife: 0.8,
          });
        }

        // Remove when hitting ground
        if (goose.y > height - 60) {
          this.geese.splice(i, 1);
        }
      } else if (goose.state === 'ESCAPED') {
        goose.y += goose.vy * deltaTime * 60;
        if (goose.y < -120) {
          this.geese.splice(i, 1);
        }
      }
    }

    // 3. Update feather particles
    for (let i = this.feathers.length - 1; i >= 0; i--) {
      const f = this.feathers[i];
      f.life += deltaTime;
      if (f.life >= f.maxLife) {
        this.feathers.splice(i, 1);
        continue;
      }

      f.x += (f.vx + Math.sin(f.life * 6) * 1.5) * deltaTime * 60;
      f.y += f.vy * deltaTime * 60;
      f.vy += 1.8 * deltaTime; // drift gravity
      f.angle += f.angularVelocity * deltaTime;
      f.alpha = Math.max(0, 1 - f.life / f.maxLife);
    }
  }

  private spawnGoose(width: number, height: number, config: LevelConfig) {
    const type = config.allowedTypes[Math.floor(Math.random() * config.allowedTypes.length)];

    let points = 5;
    let speed = 2.4 * config.baseSpeedMultiplier;

    if (type === 'BLUE') {
      points = 10;
      speed = 3.2 * config.baseSpeedMultiplier;
    } else if (type === 'RED') {
      points = 15;
      speed = 4.0 * config.baseSpeedMultiplier;
    }

    const direction: 1 | -1 = Math.random() > 0.5 ? 1 : -1;
    const startX = direction === 1 ? 40 + Math.random() * 80 : width - 140 - Math.random() * 80;
    const startY = height - 170 - Math.random() * 80;

    const angle = (Math.random() * 35 + 25) * (Math.PI / 180);
    const vx = Math.cos(angle) * speed * direction;
    const vy = -Math.sin(angle) * speed;

    const goose: GooseTarget = {
      id: Math.random().toString(36).substring(2, 9),
      type,
      points,
      x: startX,
      y: startY,
      vx,
      vy,
      speed,
      width: 76,
      height: 64,
      state: 'FLYING',
      frameIndex: 0,
      frameTimer: 0,
      direction,
      flightDuration: 0,
    };

    this.geese.push(goose);
  }

  public checkHit(aimX: number, aimY: number): { hit: boolean; goose?: GooseTarget } {
    for (let i = this.geese.length - 1; i >= 0; i--) {
      const goose = this.geese[i];
      if (goose.state !== 'FLYING') continue;

      const hitPadding = 14;
      const left = goose.x - hitPadding;
      const right = goose.x + goose.width + hitPadding;
      const top = goose.y - hitPadding;
      const bottom = goose.y + goose.height + hitPadding;

      if (aimX >= left && aimX <= right && aimY >= top && aimY <= bottom) {
        goose.state = 'HIT';
        goose.frameTimer = 0;

        // Spawn feather explosion burst
        this.spawnFeathers(goose.x + goose.width / 2, goose.y + goose.height / 2);

        return { hit: true, goose };
      }
    }
    return { hit: false };
  }

  private spawnFeathers(cx: number, cy: number) {
    const count = 12 + Math.floor(Math.random() * 6);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 4 + 1.5;
      this.feathers.push({
        x: cx + (Math.random() - 0.5) * 20,
        y: cy + (Math.random() - 0.5) * 20,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.5,
        angle: Math.random() * Math.PI * 2,
        angularVelocity: (Math.random() - 0.5) * 6,
        scale: Math.random() * 0.4 + 0.3,
        alpha: 1,
        life: 0,
        maxLife: Math.random() * 0.8 + 0.8,
      });
    }
  }

  public render(ctx: CanvasRenderingContext2D) {
    // 1. Render Geese
    for (const goose of this.geese) {
      ctx.save();

      const cx = goose.x + goose.width / 2;
      const cy = goose.y + goose.height / 2;

      ctx.translate(cx, cy);

      // Goose sprites face right by default. Flip if moving left
      if (goose.direction === -1 && goose.state !== 'FALLING') {
        ctx.scale(-1, 1);
      }

      if (goose.state === 'HIT') {
        // Shock wobble
        const wobble = Math.sin(goose.frameTimer * 40) * 0.15;
        ctx.rotate(wobble);
      }

      // Draw Goose Sprite
      this.drawGooseSprite(ctx, goose);

      ctx.restore();
    }

    // 2. Render Feathers
    const featherSprite = this.sprites.get('goose_feather');
    for (const f of this.feathers) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, f.alpha);
      ctx.translate(f.x, f.y);
      ctx.rotate(f.angle);
      ctx.scale(f.scale, f.scale);

      if (featherSprite && featherSprite.complete && featherSprite.naturalWidth > 0) {
        const fw = 32;
        const fh = 32;
        ctx.drawImage(featherSprite, -fw / 2, -fh / 2, fw, fh);
      } else {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(0, 0, 8, 18, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }

  private drawGooseSprite(ctx: CanvasRenderingContext2D, goose: GooseTarget) {
    const w = goose.width;
    const h = goose.height;
    const type = goose.type.toLowerCase();

    // Sprite image key lookup
    let spriteKey = `goose_${type}_1`;
    if (goose.state === 'FLYING') {
      spriteKey = goose.frameIndex === 0 ? `goose_${type}_1` : `goose_${type}_2`;
    } else if (goose.state === 'HIT') {
      spriteKey = `goose_${type}_hit`;
    } else if (goose.state === 'FALLING') {
      spriteKey = goose.frameIndex === 0 ? `goose_${type}_fall_1` : `goose_${type}_fall_2`;
    }

    const sprite = this.sprites.get(spriteKey) || this.sprites.get('goose_black_1');
    if (sprite && sprite.complete && sprite.naturalWidth > 0) {
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(sprite, -w / 2, -h / 2, w, h);
    }
  }
}
