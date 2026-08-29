# Contract: Game Engine API

**Feature**: `001-motion-goose-hunter`  
**Component**: 2D Canvas Game Engine  

## Core Methods

```typescript
export interface IGameEngine {
  /**
   * Initializes the engine with canvas, asset manager, and event callbacks.
   */
  init(canvas: HTMLCanvasElement, options: EngineOptions): Promise<void>;

  /**
   * Starts the 60 FPS game loop.
   */
  start(): void;

  /**
   * Pauses the game loop.
   */
  pause(): void;

  /**
   * Updates aiming reticle position from normalized coordinate inputs [-1, 1].
   */
  setAim(normX: number, normY: number): void;

  /**
   * Executes a gunshot at the current crosshair position, calculates hit detection,
   * spawns particle/flash effects, and updates score/bullet count.
   */
  fireShot(): FireResult;

  /**
   * Starts or restarts a specific level (1 through 5).
   */
  loadLevel(levelIndex: number): void;

  /**
   * Toggles audio muted/unmuted.
   */
  setAudioEnabled(enabled: boolean): void;

  /**
   * Clean up resources and event listeners.
   */
  destroy(): void;
}

export interface EngineOptions {
  onStateChange: (state: GameRoundState) => void;
  onSoundTrigger: (soundName: 'gunshot' | 'hit' | 'miss' | 'powerup' | 'win' | 'gameover') => void;
}

export interface FireResult {
  hit: boolean;
  hitTargetId?: string;
  pointsAwarded: number;
  bulletsRemaining: number;
}
```
