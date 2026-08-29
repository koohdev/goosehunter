import { AimCoordinates } from './types';

export type GripMode = 'POINTER_TOP' | 'GUN_LANDSCAPE' | 'PORTRAIT_FACE';

export interface MotionConfig {
  sensitivityX: number; // Degrees for full horizontal screen width
  sensitivityY: number; // Degrees for full vertical screen height
  smoothingAlpha: number; // 0.1 (smooth) to 1.0 (instant)
  gripMode: GripMode;
  invertY: boolean;
  invertX: boolean;
}

function wrapAngle(deg: number): number {
  let a = deg % 360;
  if (a > 180) a -= 360;
  if (a < -180) a += 360;
  return a;
}

export class MotionSensorService {
  private config: MotionConfig = {
    sensitivityX: 24, // 24 degrees comfortable wrist sweep
    sensitivityY: 18, // 18 degrees comfortable vertical sweep
    smoothingAlpha: 0.75,
    gripMode: 'POINTER_TOP', // Default to pointing top of phone at screen like a gun/remote
    invertY: false,
    invertX: false,
  };

  private centerAlpha: number = 0;
  private centerBeta: number = 0;
  private centerGamma: number = 0;

  private currentRawAngles = { alpha: 0, beta: 0, gamma: 0 };
  private currentDeltas = { dx: 0, dy: 0 };

  private smoothedX: number = 0;
  private smoothedY: number = 0;
  private isCalibrated: boolean = false;
  private isListening: boolean = false;
  private listenerCallback: ((coords: AimCoordinates) => void) | null = null;

  public setConfig(partial: Partial<MotionConfig>) {
    this.config = { ...this.config, ...partial };
  }

  public getConfig(): MotionConfig {
    return { ...this.config };
  }

  public getCurrentDebugInfo() {
    return {
      raw: { ...this.currentRawAngles },
      deltas: { ...this.currentDeltas },
      center: { alpha: this.centerAlpha, beta: this.centerBeta, gamma: this.centerGamma },
      smoothed: { x: this.smoothedX, y: this.smoothedY },
    };
  }

  public async requestPermissions(): Promise<boolean> {
    if (typeof window === 'undefined') return false;

    const DeviceOrientation = window.DeviceOrientationEvent as unknown as {
      requestPermission?: () => Promise<'granted' | 'denied'>;
    };

    if (typeof DeviceOrientation?.requestPermission === 'function') {
      try {
        const response = await DeviceOrientation.requestPermission();
        return response === 'granted';
      } catch (err) {
        console.warn('DeviceOrientation permission rejected:', err);
        return false;
      }
    }

    return true;
  }

  public calibrate(beta: number, gamma: number, alpha?: number | null) {
    const validAlpha = typeof alpha === 'number' && !isNaN(alpha) ? alpha : 0;
    this.centerAlpha = validAlpha;
    this.centerBeta = beta;
    this.centerGamma = gamma;

    this.smoothedX = 0;
    this.smoothedY = 0;
    this.isCalibrated = true;
  }

  public isReady(): boolean {
    return this.isCalibrated;
  }

  public calculateDeltaDegrees(beta: number, gamma: number, alpha?: number | null): { deltaX: number; deltaY: number } {
    const hasAlpha = typeof alpha === 'number' && !isNaN(alpha);
    const curAlpha = hasAlpha ? alpha : 0;

    let deltaX = 0;
    let deltaY = 0;

    this.currentRawAngles = { alpha: curAlpha, beta, gamma };

    if (this.config.gripMode === 'POINTER_TOP') {
      // ----------------------------------------------------
      // Mode 1: Top of phone points at screen (Pistol / Remote)
      // ----------------------------------------------------
      // Horizontal aim = Yaw (alpha) scaled by cosine of pitch
      if (hasAlpha) {
        const radBeta = (beta * Math.PI) / 180;
        const cosBeta = Math.max(0.2, Math.cos(radBeta));
        deltaX = wrapAngle(this.centerAlpha - curAlpha) * cosBeta;
      } else {
        // Fallback to roll if compass alpha is unavailable
        deltaX = gamma - this.centerGamma;
      }

      // Vertical aim = Pitch (beta)
      deltaY = -(beta - this.centerBeta);
    } else if (this.config.gripMode === 'GUN_LANDSCAPE') {
      // ----------------------------------------------------
      // Mode 2: Landscape Gun Grip (phone held horizontally on side)
      // ----------------------------------------------------
      if (hasAlpha) {
        deltaX = wrapAngle(this.centerAlpha - curAlpha);
      } else {
        deltaX = -(beta - this.centerBeta);
      }

      // In landscape, tilting up/down changes gamma (roll in portrait frame)
      deltaY = -(gamma - this.centerGamma);
    } else {
      // ----------------------------------------------------
      // Mode 3: Portrait Face (upright, screen facing user)
      // ----------------------------------------------------
      if (hasAlpha) {
        deltaX = wrapAngle(this.centerAlpha - curAlpha);
      } else {
        deltaX = gamma - this.centerGamma;
      }

      deltaY = -(beta - this.centerBeta);
    }

    if (this.config.invertX) deltaX = -deltaX;
    if (this.config.invertY) deltaY = -deltaY;

    this.currentDeltas = { dx: deltaX, dy: deltaY };

    return { deltaX, deltaY };
  }

  public processOrientation(beta: number, gamma: number, alpha?: number | null): AimCoordinates {
    const { deltaX, deltaY } = this.calculateDeltaDegrees(beta, gamma, alpha);

    // Normalize to [-1.0, 1.0] range based on sensitivity angles
    const sensX = Math.max(5, this.config.sensitivityX);
    const sensY = Math.max(5, this.config.sensitivityY);

    let rawX = deltaX / sensX;
    let rawY = deltaY / sensY;

    // Apply gentle power curve (x^1.05) for smooth center aiming + easy screen edge reach
    const signX = Math.sign(rawX);
    const signY = Math.sign(rawY);
    rawX = signX * Math.pow(Math.min(1, Math.abs(rawX)), 1.05);
    rawY = signY * Math.pow(Math.min(1, Math.abs(rawY)), 1.05);

    // Clamp between -1.0 and 1.0
    rawX = Math.max(-1, Math.min(1, rawX));
    rawY = Math.max(-1, Math.min(1, rawY));

    // Low-latency exponential moving average smoothing
    const a = this.config.smoothingAlpha;
    this.smoothedX = a * rawX + (1 - a) * this.smoothedX;
    this.smoothedY = a * rawY + (1 - a) * this.smoothedY;

    return {
      x: Number(this.smoothedX.toFixed(4)),
      y: Number(this.smoothedY.toFixed(4)),
      timestamp: Date.now(),
    };
  }

  public startListening(callback: (coords: AimCoordinates) => void) {
    if (typeof window === 'undefined') return;
    this.listenerCallback = callback;

    if (!this.isListening) {
      window.addEventListener('deviceorientation', this.handleOrientation, { passive: true });
      this.isListening = true;
    }
  }

  public stopListening() {
    if (typeof window === 'undefined') return;
    if (this.isListening) {
      window.removeEventListener('deviceorientation', this.handleOrientation);
      this.isListening = false;
      this.listenerCallback = null;
    }
  }

  private handleOrientation = (event: DeviceOrientationEvent) => {
    if (event.beta === null || event.gamma === null) return;

    if (!this.isCalibrated) {
      this.calibrate(event.beta, event.gamma, event.alpha);
    }

    if (this.listenerCallback) {
      const coords = this.processOrientation(event.beta, event.gamma, event.alpha);
      this.listenerCallback(coords);
    }
  };

  public triggerHaptic(durationMs = 40) {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(durationMs);
      } catch {
        // Ignored
      }
    }
  }
}

export const motionSensor = new MotionSensorService();
