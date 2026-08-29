import { AimCoordinates } from './types';

function wrapAngle(deg: number): number {
  let a = deg % 360;
  if (a > 180) a -= 360;
  if (a < -180) a += 360;
  return a;
}

export class MotionSensorService {
  public sensitivityX: number = 22; // Degrees to reach horizontal border
  public sensitivityY: number = 18; // Degrees to reach vertical border
  public smoothingAlpha: number = 0.75; // Low-latency EMA filter
  public invertY: boolean = false;
  public invertX: boolean = false;

  private centerAlpha: number = 0;
  private centerBeta: number = 0;
  private centerGamma: number = 0;

  private smoothedX: number = 0;
  private smoothedY: number = 0;
  private isCalibrated: boolean = false;
  private isListening: boolean = false;
  private listenerCallback: ((coords: AimCoordinates) => void) | null = null;

  public setSensitivityPreset(preset: 'LOW' | 'NORMAL' | 'HIGH') {
    if (preset === 'LOW') {
      this.sensitivityX = 30;
      this.sensitivityY = 24;
      this.smoothingAlpha = 0.65;
    } else if (preset === 'NORMAL') {
      this.sensitivityX = 22;
      this.sensitivityY = 18;
      this.smoothingAlpha = 0.75;
    } else if (preset === 'HIGH') {
      this.sensitivityX = 15;
      this.sensitivityY = 12;
      this.smoothingAlpha = 0.85;
    }
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
    let deltaY = -(beta - this.centerBeta);

    if (hasAlpha) {
      const radBeta = (beta * Math.PI) / 180;
      const cosBeta = Math.max(0.2, Math.cos(radBeta));
      deltaX = wrapAngle(this.centerAlpha - curAlpha) * cosBeta;
    } else {
      deltaX = gamma - this.centerGamma;
    }

    if (this.invertX) deltaX = -deltaX;
    if (this.invertY) deltaY = -deltaY;

    // Deadband tremor filter (0.15 deg)
    if (Math.abs(deltaX) < 0.15) deltaX = 0;
    if (Math.abs(deltaY) < 0.15) deltaY = 0;

    let rawX = deltaX / Math.max(5, this.sensitivityX);
    let rawY = deltaY / Math.max(5, this.sensitivityY);

    // Subtle power curve for precision center aim + easy edge reach
    const signX = Math.sign(rawX);
    const signY = Math.sign(rawY);
    rawX = signX * Math.pow(Math.min(1, Math.abs(rawX)), 1.08);
    rawY = signY * Math.pow(Math.min(1, Math.abs(rawY)), 1.08);

    // Clamp between -1.0 and 1.0
    rawX = Math.max(-1, Math.min(1, rawX));
    rawY = Math.max(-1, Math.min(1, rawY));

    // Low-pass EMA smoothing
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
