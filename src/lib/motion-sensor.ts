import { MotionCalibration, AimCoordinates } from './types';

export class MotionSensorService {
  private calibration: MotionCalibration = {
    centerBeta: 0,
    centerGamma: 0,
    sensitivityX: 20, // Degrees of tilt for full screen width traversal
    sensitivityY: 16, // Degrees of tilt for full screen height traversal
  };

  private smoothedX: number = 0;
  private smoothedY: number = 0;
  private smoothingAlpha: number = 0.7; // Responsive low-latency smoothing
  private isCalibrated: boolean = false;
  private isListening: boolean = false;
  private listenerCallback: ((coords: AimCoordinates) => void) | null = null;

  public getScreenOrientation(): number {
    if (typeof window === 'undefined') return 0;
    if (window.screen?.orientation?.angle !== undefined) {
      return window.screen.orientation.angle;
    }
    if (typeof window.orientation === 'number') {
      return window.orientation;
    }
    return window.innerWidth > window.innerHeight ? 90 : 0;
  }

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

    // Android & modern mobile browsers allow by default
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
    const angle = this.getScreenOrientation();
    const deltaGamma = gamma - this.calibration.centerGamma;
    const deltaBeta = beta - this.calibration.centerBeta;

    let deltaX = 0;
    let deltaY = 0;

    if (angle === 90) {
      // Landscape Primary (Two-handed landscape gun grip, camera on left)
      deltaX = -deltaBeta;
      deltaY = -deltaGamma;
    } else if (angle === -90 || angle === 270) {
      // Landscape Secondary (camera on right)
      deltaX = deltaBeta;
      deltaY = deltaGamma;
    } else if (angle === 180) {
      // Upside down
      deltaX = -deltaGamma;
      deltaY = -deltaBeta;
    } else {
      // Portrait fallback
      deltaX = deltaGamma;
      deltaY = deltaBeta;
    }

    // Map delta angles to normalized [-1, 1] range
    let rawX = deltaX / this.calibration.sensitivityX;
    let rawY = deltaY / this.calibration.sensitivityY;

    // Clamp between -1 and 1
    rawX = Math.max(-1, Math.min(1, rawX));
    rawY = Math.max(-1, Math.min(1, rawY));

    return { rawX, rawY };
  }

  public processOrientation(beta: number, gamma: number): AimCoordinates {
    const { rawX, rawY } = this.getRawDelta(beta, gamma);

    // Apply Exponential Moving Average (EMA) smoothing for jitter-free tracking
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
        // Ignored
      }
    }
  }
}

export const motionSensor = new MotionSensorService();
