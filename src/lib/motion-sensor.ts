import { MotionCalibration, AimCoordinates } from './types';

export class MotionSensorService {
  private calibration: MotionCalibration = {
    centerBeta: 0,
    centerGamma: 0,
    sensitivityX: 25, // degrees of roll/yaw for full screen edge deflection
    sensitivityY: 20, // degrees of pitch for full screen edge deflection
  };

  private smoothedX: number = 0;
  private smoothedY: number = 0;
  private smoothingAlpha: number = 0.65; // Responsive yet smooth filter
  private isCalibrated: boolean = false;
  private isListening: boolean = false;
  private listenerCallback: ((coords: AimCoordinates) => void) | null = null;

  public async requestPermissions(): Promise<boolean> {
    if (typeof window === 'undefined') return false;

    // Check iOS 13+ DeviceOrientation permission requirement
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

    // Android & other modern browsers allow by default
    return true;
  }

  public calibrate(beta: number, gamma: number) {
    this.calibration.centerBeta = beta;
    this.calibration.centerGamma = gamma;
    this.smoothedX = 0;
    this.smoothedY = 0;
    this.isCalibrated = true;
  }

  public isReady(): boolean {
    return this.isCalibrated;
  }

  public getRawDelta(beta: number, gamma: number): { rawX: number; rawY: number } {
    const deltaGamma = gamma - this.calibration.centerGamma;
    const deltaBeta = beta - this.calibration.centerBeta;

    // Map delta angles to normalized [-1, 1] range
    let rawX = deltaGamma / this.calibration.sensitivityX;
    let rawY = deltaBeta / this.calibration.sensitivityY;

    // Clamp between -1 and 1
    rawX = Math.max(-1, Math.min(1, rawX));
    rawY = Math.max(-1, Math.min(1, rawY));

    return { rawX, rawY };
  }

  public processOrientation(beta: number, gamma: number): AimCoordinates {
    const { rawX, rawY } = this.getRawDelta(beta, gamma);

    // Apply Exponential Moving Average (EMA) smoothing
    this.smoothedX = this.smoothingAlpha * rawX + (1 - this.smoothingAlpha) * this.smoothedX;
    this.smoothedY = this.smoothingAlpha * rawY + (1 - this.smoothingAlpha) * this.smoothedY;

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
      // Auto initial center
      this.calibrate(event.beta, event.gamma);
    }

    if (this.listenerCallback) {
      const coords = this.processOrientation(event.beta, event.gamma);
      this.listenerCallback(coords);
    }
  };

  public triggerHaptic(durationMs = 40) {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(durationMs);
      } catch {
        // Ignored on unsupported devices
      }
    }
  }
}

export const motionSensor = new MotionSensorService();
