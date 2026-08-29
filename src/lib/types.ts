export type SessionStatus = 'LOBBY' | 'CALIBRATING' | 'PLAYING' | 'ROUND_WON' | 'GAME_OVER';

export type GooseType = 'BLACK' | 'BLUE' | 'RED';
export type GooseState = 'SPAWNING' | 'FLYING' | 'HIT' | 'FALLING' | 'ESCAPED';

export interface GameSession {
  sessionId: string;
  hostSocketId: string | null;
  controllerSocketId: string | null;
  status: SessionStatus;
  createdAt: number;
  lastActiveAt: number;
}

export interface MotionCalibration {
  centerBeta: number;
  centerGamma: number;
  sensitivityX: number;
  sensitivityY: number;
}

export interface AimCoordinates {
  x: number; // Normalized [-1.0, 1.0]
  y: number; // Normalized [-1.0, 1.0]
  timestamp: number;
}

export interface TriggerEvent {
  sessionId: string;
  x: number;
  y: number;
  timestamp: number;
}

export interface GooseTarget {
  id: string;
  type: GooseType;
  points: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  speed: number;
  width: number;
  height: number;
  state: GooseState;
  frameIndex: number;
  frameTimer: number;
  direction: 1 | -1;
  flightDuration: number;
}

export interface LevelConfig {
  level: number;
  targetScore: number;
  totalBullets: number;
  simultaneousGeese: number;
  baseSpeedMultiplier: number;
  allowedTypes: GooseType[];
  themeBackground: string;
}

export interface GameRoundState {
  currentLevel: number;
  score: number;
  highScore: number;
  bulletsRemaining: number;
  missedShots: number;
  shotsFired: number;
  geeseHit: number;
  status: SessionStatus;
  isSoloMouseMode: boolean;
  soundEnabled: boolean;
}

export interface FireResult {
  hit: boolean;
  hitTargetId?: string;
  pointsAwarded: number;
  bulletsRemaining: number;
  gooseType?: GooseType;
  x: number;
  y: number;
}
