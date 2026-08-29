# Contract: Mobile Controller API

**Feature**: `001-motion-goose-hunter`  
**Component**: Mobile Motion & Orientation Client  

## Core Methods & Event Hooks

```typescript
export interface IMotionController {
  /**
   * Requests device orientation permissions (handles iOS 13+ permission prompts).
   */
  requestPermissions(): Promise<boolean>;

  /**
   * Sets current physical orientation as the neutral screen center (0, 0).
   */
  calibrateOrigin(): void;

  /**
   * Starts listening to DeviceOrientationEvents and begins streaming aim updates.
   */
  startTracking(onAimDelta: (normX: number, normY: number) => void): void;

  /**
   * Stops tracking orientation events.
   */
  stopTracking(): void;

  /**
   * Triggers local haptic vibration and audio feedback on shot.
   */
  triggerHaptic(durationMs?: number): void;
}
```
