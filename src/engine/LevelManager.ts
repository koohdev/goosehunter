import { LevelConfig, GameRoundState, SessionStatus } from '@/lib/types';

export const LEVEL_CONFIGS: Record<number, LevelConfig> = {
  1: {
    level: 1,
    targetScore: 60,
    totalBullets: 10,
    simultaneousGeese: 2,
    baseSpeedMultiplier: 1.0,
    allowedTypes: ['BLACK', 'BLUE'],
    themeBackground: '/images/arcade-bg-marsh-day.png',
  },
  2: {
    level: 2,
    targetScore: 70,
    totalBullets: 10,
    simultaneousGeese: 2,
    baseSpeedMultiplier: 1.25,
    allowedTypes: ['BLACK', 'BLUE', 'RED'],
    themeBackground: '/images/arcade-bg-marsh-dusk.png',
  },
  3: {
    level: 3,
    targetScore: 80,
    totalBullets: 10,
    simultaneousGeese: 3, // +1 extra goose
    baseSpeedMultiplier: 1.45,
    allowedTypes: ['BLACK', 'BLUE', 'RED'],
    themeBackground: '/images/arcade-bg-marsh-snow.png',
  },
  4: {
    level: 4,
    targetScore: 90,
    totalBullets: 10,
    simultaneousGeese: 3,
    baseSpeedMultiplier: 1.65,
    allowedTypes: ['BLACK', 'BLUE', 'RED'],
    themeBackground: '/images/arcade-bg-marsh-day.png',
  },
  5: {
    level: 5,
    targetScore: 100,
    totalBullets: 10,
    simultaneousGeese: 4, // +2 extra geese
    baseSpeedMultiplier: 1.9,
    allowedTypes: ['BLUE', 'RED'],
    themeBackground: '/images/arcade-bg-marsh-dusk.png',
  },
};

export class LevelManager {
  private state: GameRoundState;

  constructor() {
    this.state = {
      currentLevel: 1,
      score: 0,
      highScore: this.loadHighScore(),
      bulletsRemaining: 10,
      missedShots: 0,
      shotsFired: 0,
      geeseHit: 0,
      status: 'LOBBY',
      isSoloMouseMode: false,
      soundEnabled: true,
    };
  }

  public getState(): GameRoundState {
    return { ...this.state };
  }

  public setStatus(status: SessionStatus) {
    this.state.status = status;
  }

  public setSoloMouseMode(isSolo: boolean) {
    this.state.isSoloMouseMode = isSolo;
  }

  public setSoundEnabled(enabled: boolean) {
    this.state.soundEnabled = enabled;
  }

  public getCurrentConfig(): LevelConfig {
    return LEVEL_CONFIGS[this.state.currentLevel] || LEVEL_CONFIGS[1];
  }

  public startRound(level = this.state.currentLevel) {
    const config = LEVEL_CONFIGS[level] || LEVEL_CONFIGS[1];
    this.state.currentLevel = config.level;
    this.state.bulletsRemaining = config.totalBullets;
    this.state.missedShots = 0;
    this.state.shotsFired = 0;
    this.state.geeseHit = 0;
    this.state.status = 'PLAYING';
  }

  public recordShot(hit: boolean, points: number = 0): { roundFinished: boolean; won: boolean } {
    if (this.state.bulletsRemaining <= 0) {
      return { roundFinished: true, won: this.state.score >= this.getCurrentConfig().targetScore };
    }

    this.state.bulletsRemaining -= 1;
    this.state.shotsFired += 1;

    if (hit) {
      this.state.geeseHit += 1;
      this.state.score += points;
      if (this.state.score > this.state.highScore) {
        this.state.highScore = this.state.score;
        this.saveHighScore(this.state.score);
      }
    } else {
      this.state.missedShots += 1;
    }

    const config = this.getCurrentConfig();
    const isOutOfBullets = this.state.bulletsRemaining <= 0;
    const isWon = this.state.score >= config.targetScore;

    if (isOutOfBullets) {
      this.state.status = isWon ? 'ROUND_WON' : 'GAME_OVER';
      return { roundFinished: true, won: isWon };
    }

    return { roundFinished: false, won: isWon };
  }

  public nextLevel(): boolean {
    if (this.state.currentLevel < 5) {
      this.state.currentLevel += 1;
      this.startRound(this.state.currentLevel);
      return true;
    }
    // Loop / Victory loop
    this.startRound(5);
    return false;
  }

  public restartLevel() {
    this.startRound(this.state.currentLevel);
  }

  public resetGame() {
    this.state.score = 0;
    this.state.currentLevel = 1;
    this.startRound(1);
  }

  private loadHighScore(): number {
    if (typeof window === 'undefined') return 0;
    try {
      const saved = localStorage.getItem('GH_HIGH_SCORE');
      return saved ? parseInt(saved, 10) || 0 : 0;
    } catch {
      return 0;
    }
  }

  private saveHighScore(score: number) {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem('GH_HIGH_SCORE', score.toString());
    } catch {
      // Ignored in private/storage restricted windows
    }
  }
}
