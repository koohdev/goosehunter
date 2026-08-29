import { GooseTarget, LevelConfig } from '@/lib/types';

export class GooseManager {
  private geese: GooseTarget[] = [];
  private sprites: Map<string, HTMLImageElement> = new Map();
  private lastSpawnTime: number = 0;

  constructor() {
    this.preloadSprites();
  }

  private preloadSprites() {
    if (typeof window === 'undefined') return;

    const spritePaths: { key: string; src: string }[] = [
      { key: 'goose_black_1', src: '/images/goose-black01.png' },
      { key: 'goose_black_2', src: '/images/goose-black02.png' },
      { key: 'goose_blue_1', src: '/images/goose-blue01.png' },
      { key: 'goose_blue_2', src: '/images/goose-blue02.png' },
      { key: 'goose_red_1', src: '/images/bird3.png' },
      { key: 'goose_red_2', src: '/images/bird2.png' },
      { key: 'goose_hit', src: '/images/hit.png' },
    ];

    spritePaths.forEach(({ key, src }) => {
      const img = new Image();
      img.src = src;
      img.onload = () => this.sprites.set(key, img);
    });
  }

  public reset() {
    this.geese = [];
    this.lastSpawnTime = Date.now();
  }

  public getGeese(): GooseTarget[] {
    return this.geese;
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
        if (goose.x < 20) {
          goose.x = 20;
          goose.vx = Math.abs(goose.vx);
          goose.direction = 1;
        } else if (goose.x + goose.width > width - 20) {
          goose.x = width - 20 - goose.width;
          goose.vx = -Math.abs(goose.vx);
          goose.direction = -1;
        }

        // Top ceiling escape or bounce
        if (goose.y < 30) {
          goose.y = 30;
          goose.vy = Math.abs(goose.vy) * 0.8; // change flight angle
        }

        // Bottom floor bound
        if (goose.y > height - 160) {
          goose.y = height - 160;
          goose.vy = -Math.abs(goose.vy);
        }

        // Wing flapping animation timer
        goose.frameTimer += deltaTime;
        if (goose.frameTimer > 0.12) {
          goose.frameTimer = 0;
          goose.frameIndex = (goose.frameIndex + 1) % 3;
        }

        // Escape after duration
        goose.flightDuration += deltaTime;
        if (goose.flightDuration > 14) {
          goose.state = 'ESCAPED';
          goose.vy = -4; // Fly away into clouds
        }
      } else if (goose.state === 'HIT') {
        // Pause briefly in stunned state
        goose.frameTimer += deltaTime;
        if (goose.frameTimer > 0.25) {
          goose.state = 'FALLING';
          goose.vy = 2; // Begin fall
        }
      } else if (goose.state === 'FALLING') {
        // Accelerate downwards with gravity
        goose.vy += 9.8 * deltaTime * 0.7;
        goose.y += goose.vy * deltaTime * 60;

        // Remove when hitting ground
        if (goose.y > height - 60) {
          this.geese.splice(i, 1);
        }
      } else if (goose.state === 'ESCAPED') {
        goose.y += goose.vy * deltaTime * 60;
        if (goose.y < -100) {
          this.geese.splice(i, 1);
        }
      }
    }
  }

  private spawnGoose(width: number, height: number, config: LevelConfig) {
    // Select type based on level allowed types
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
    const startX = direction === 1 ? 50 + Math.random() * 100 : width - 150 - Math.random() * 100;
    const startY = height - 160 - Math.random() * 80;

    const angle = (Math.random() * 35 + 25) * (Math.PI / 180); // 25 to 60 degrees upward
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
      width: 56,
      height: 48,
      state: 'FLYING',
      frameIndex: 0,
      frameTimer: 0,
      direction,
      flightDuration: 0,
    };

    this.geese.push(goose);
  }

  public checkHit(aimX: number, aimY: number): { hit: boolean; goose?: GooseTarget } {
    // Check collision from frontmost active flying geese
    for (let i = this.geese.length - 1; i >= 0; i--) {
      const goose = this.geese[i];
      if (goose.state !== 'FLYING') continue;

      // Expanded hitbox for arcade feel (+12px tolerance)
      const hitPadding = 12;
      const left = goose.x - hitPadding;
      const right = goose.x + goose.width + hitPadding;
      const top = goose.y - hitPadding;
      const bottom = goose.y + goose.height + hitPadding;

      if (aimX >= left && aimX <= right && aimY >= top && aimY <= bottom) {
        goose.state = 'HIT';
        goose.frameTimer = 0;
        return { hit: true, goose };
      }
    }
    return { hit: false };
  }

  public render(ctx: CanvasRenderingContext2D) {
    for (const goose of this.geese) {
      ctx.save();

      const cx = goose.x + goose.width / 2;
      const cy = goose.y + goose.height / 2;

      ctx.translate(cx, cy);
      if (goose.direction === -1 && goose.state !== 'FALLING') {
        ctx.scale(-1, 1);
      }

      if (goose.state === 'FALLING') {
        ctx.rotate(Math.PI / 2);
      }

      // Draw Goose Sprite or Retro Vector
      this.drawGooseSprite(ctx, goose);

      ctx.restore();
    }
  }

  private drawGooseSprite(ctx: CanvasRenderingContext2D, goose: GooseTarget) {
    const w = goose.width;
    const h = goose.height;

    // Sprite image key lookup
    let spriteKey = 'goose_black_1';
    if (goose.type === 'BLUE') spriteKey = goose.frameIndex === 0 ? 'goose_blue_1' : 'goose_blue_2';
    else if (goose.type === 'RED') spriteKey = goose.frameIndex === 0 ? 'goose_red_1' : 'goose_red_2';
    else spriteKey = goose.frameIndex === 0 ? 'goose_black_1' : 'goose_black_2';

    if (goose.state === 'HIT') spriteKey = 'goose_hit';

    const sprite = this.sprites.get(spriteKey);
    if (sprite && sprite.complete && sprite.naturalWidth > 0) {
      ctx.drawImage(sprite, -w / 2, -h / 2, w, h);
    } else {
      // Procedural Retro Pixel Art Fallback
      this.drawProceduralGoose(ctx, goose, w, h);
    }
  }

  private drawProceduralGoose(ctx: CanvasRenderingContext2D, goose: GooseTarget, w: number, h: number) {
    let bodyColor = '#18181b'; // Black
    let wingColor = '#52525b';
    let headColor = '#15803d'; // Green head

    if (goose.type === 'BLUE') {
      bodyColor = '#2563eb';
      wingColor = '#9333ea';
      headColor = '#0284c7';
    } else if (goose.type === 'RED') {
      bodyColor = '#dc2626';
      wingColor = '#ea580c';
      headColor = '#991b1b';
    }

    // Body
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.ellipse(0, 4, w / 2.5, h / 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Head
    ctx.fillStyle = headColor;
    ctx.beginPath();
    ctx.arc(w / 3, -6, 10, 0, Math.PI * 2);
    ctx.fill();

    // Beak
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.moveTo(w / 3 + 8, -8);
    ctx.lineTo(w / 3 + 18, -5);
    ctx.lineTo(w / 3 + 8, -2);
    ctx.closePath();
    ctx.fill();

    // Wing (Flapping position based on frameIndex)
    ctx.fillStyle = wingColor;
    ctx.beginPath();
    if (goose.frameIndex === 0) {
      // Wing UP
      ctx.ellipse(-4, -12, 12, 18, -0.3, 0, Math.PI * 2);
    } else if (goose.frameIndex === 1) {
      // Wing MID
      ctx.ellipse(-4, 0, 16, 10, 0, 0, Math.PI * 2);
    } else {
      // Wing DOWN
      ctx.ellipse(-4, 14, 12, 16, 0.3, 0, Math.PI * 2);
    }
    ctx.fill();

    // Eye
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(w / 3 + 4, -8, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(w / 3 + 5, -8, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }
}
