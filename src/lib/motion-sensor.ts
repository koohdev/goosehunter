import { AimCoordinates } from './types';

export type GripMode = 'GUN_LANDSCAPE' | 'POINTER_TOP' | 'PORTRAIT';

export interface MotionConfig {
  sensitivityX: number; // Degrees for full horizontal screen width
  sensitivityY: number; // Degrees for full vertical screen height
  smoothingAlpha: number; // 0.1 (very smooth) to 0.9 (instant)
  gripMode: GripMode;
  invertY: boolean;
}

export class MotionSensorService {
  private config: MotionConfig = {
    sensitivityX: 26, // 26 degrees comfortable wrist aim across screen
    sensitivityY: 20, // 20 degrees comfortable vertical tilt
    smoothingAlpha: 0.7,
    gripMode: 'GUN_LANDSCAPE',
    invertY: false,
  };

  private centerMatrix: number[][] | null = null;
  private centerBeta: number = 0;
  private centerGamma: number = 0;
  private centerAlpha: number = 0;

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

  /**
   * Convert W3C DeviceOrientation Euler angles (alpha, beta, gamma) into a 3x3 rotation matrix.
   */
  private getRotationMatrix(alpha: number, beta: number, gamma: number): number[][] {
    const deg2rad = Math.PI / 180;
    const a = alpha * deg2rad;
    const b = beta * deg2rad;
    const g = gamma * deg2rad;

    const cA = Math.cos(a), sA = Math.sin(a);
    const cB = Math.cos(b), sB = Math.sin(b);
    const cG = Math.cos(g), sG = Math.sin(g);

    // Z-X'-Y'' Intrinsic Rotation Matrix
    return [
      [cA * cG - sA * sB * sG, -cB * sA, cA * sG + sA * sB * cG],
      [sA * cG + cA * sB * sG,  cA * cB, sA * sG - cA * sB * cG],
      [-cB * sG,                sB,      cB * cG],
    ];
  }

  /**
   * Compute relative rotation matrix: R_rel = R_center^T * R_current
   */
  private getRelativeMatrix(R0: number[][], R: number[][]): number[][] {
    const res = [
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
    ];
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        res[i][j] = R0[0][i] * R[0][j] + R0[1][i] * R[1][j] + R0[2][i] * R[2][j];
      }
    }
    return res;
  }

  public calibrate(beta: number, gamma: number, alpha?: number | null) {
    const validAlpha = typeof alpha === 'number' && !isNaN(alpha) ? alpha : 0;
    this.centerAlpha = validAlpha;
    this.centerBeta = beta;
    this.centerGamma = gamma;

    this.centerMatrix = this.getRotationMatrix(validAlpha, beta, gamma);
    this.smoothedX = 0;
    this.smoothedY = 0;
    this.isCalibrated = true;
  }

  public isReady(): boolean {
    return this.isCalibrated;
  }

  public getRawDelta(beta: number, gamma: number, alpha?: number | null): { rawX: number; rawY: number } {
    const hasAlpha = typeof alpha === 'number' && !isNaN(alpha);
    const currentAlpha = hasAlpha ? alpha : 0;

    let deltaXDeg = 0;
    let deltaYDeg = 0;

    if (this.centerMatrix && hasAlpha) {
      // 3D Matrix Relative Tracking (Gimbal-Lock Free)
      const currentMatrix = this.getRotationMatrix(currentAlpha, beta, gamma);
      const Rrel = this.getRelativeMatrix(this.centerMatrix, currentMatrix);

      // Aim Vector based on Grip Mode
      let vx = 0;
      let vy = 0;
      let vz = -1;

      if (this.config.gripMode === 'POINTER_TOP') {
        // Pointing with the top edge of phone (Wiimote / Laser style)
        vx = Rrel[0][1];
        vy = Rrel[1][1];
        vz = -Rrel[2][1];
      } else {
        // Landscape Gun Grip / Portrait (Aiming line of sight towards screen)
        vx = -Rrel[0][2];
        vy = -Rrel[1][2];
        vz = -Rrel[2][2];
      }

      // Convert aim vector to horizontal/vertical deflection angles in degrees
      deltaXDeg = Math.atan2(vx, Math.abs(vz) > 0.001 ? -vz : 1) * (180 / Math.PI);
      deltaYDeg = Math.atan2(vy, Math.abs(vz) > 0.001 ? -vz : 1) * (180 / Math.PI);
    } else {
      // Direct Euler delta fallback when Alpha compass is unavailable
      const isLandscape = this.config.gripMode === 'GUN_LANDSCAPE';
      if (isLandscape) {
        deltaXDeg = -(beta - this.centerBeta);
        deltaYDeg = gamma - this.centerGamma;
      } else {
        deltaXDeg = gamma - this.centerGamma;
        deltaYDeg = beta - this.centerBeta;
      }
    }

    if (this.config.invertY) {
      deltaYDeg = -deltaYDeg;
    }

    // Map degrees to normalized range [-1.0, 1.0] with comfortable response curve
    let rawX = deltaXDeg / Math.max(5, this.config.sensitivityX);
    let rawY = deltaYDeg / Math.max(5, this.config.sensitivityY);

    // Apply subtle power curve for micro-aim precision in center + reach at borders
    const signX = Math.sign(rawX);
    const signY = Math.sign(rawY);
    rawX = signX * Math.pow(Math.min(1, Math.abs(rawX)), 1.1);
    rawY = signY * Math.pow(Math.min(1, Math.abs(rawY)), 1.1);

    // Clamp between -1 and 1
    rawX = Math.max(-1, Math.min(1, rawX));
    rawY = Math.max(-1, Math.min(1, rawY));

    return { rawX, rawY };
  }

  public processOrientation(beta: number, gamma: number, alpha?: number | null): AimCoordinates {
    const { rawX, rawY } = this.getRawDelta(beta, gamma, alpha);

    // Exponential Moving Average (EMA) smoothing for jitter-free tracking
    const alphaSmoothing = this.config.smoothingAlpha;
    this.smoothedX = alphaSmoothing * rawX + (1 - alphaSmoothing) * this.smoothedX;
    this.smoothedY = alphaSmoothing * rawY + (1 - alphaSmoothing) * this.smoothedY;

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
