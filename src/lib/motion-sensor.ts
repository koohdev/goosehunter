import { AimCoordinates } from './types';

function wrapAngle(deg: number): number {
  let a = deg % 360;
  if (a > 180) a -= 360;
  if (a < -180) a += 360;
  return a;
}

export class MotionSensorService {
  private sensitivityX: number = 22; // Degrees to reach left/right edge
  private sensitivityY: number = 18; // Degrees to reach top/bottom edge
  private smoothingAlpha: number = 0.8;

  private centerAlpha: number = 0;
  private centerBeta: number = 0;
  private centerGamma: number = 0;

  private smoothedX: number = 0;
  private smoothedY: number = 0;
  private isCalibrated: boolean = false;
  private isListening: boolean = false;
  private listenerCallback: ((coords: AimCoordinates) => void) | null = null;

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
    this.centerAlpha = typeof alpha === 'number' && !isNaN(alpha) ? alpha : 0;
    this.centerBeta = beta;
    this.centerGamma = gamma;

    this.smoothedX = 0;
    this.smoothedY = 0;
    this.isCalibrated = true;
  }

  public isReady(): boolean {
    return this.isCalibrated;
  }

  public processOrientation(beta: number, gamma: number, alpha?: number | null): AimCoordinates {
    const hasAlpha = typeof alpha === 'number' && !isNaN(alpha);
    const curAlpha = hasAlpha ? alpha : 0;

    let deltaX = 0;
    const deltaY = -(beta - this.centerBeta);

    if (hasAlpha) {
      const radBeta = (beta * Math.PI) / 180;
      const cosBeta = Math.max(0.2, Math.cos(radBeta));
      deltaX = wrapAngle(this.centerAlpha - curAlpha) * cosBeta;
    } else {
      deltaX = gamma - this.centerGamma;
    }

    let rawX = deltaX / this.sensitivityX;
    let rawY = deltaY / this.sensitivityY;

    // Clamp between -1.0 and 1.0
    rawX = Math.max(-1, Math.min(1, rawX));
    rawY = Math.max(-1, Math.min(1, rawY));

    // Smoothing
    const a = this.smoothingAlpha;
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
