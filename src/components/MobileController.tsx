'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Crosshair, RotateCcw, Smartphone, Gamepad2 } from 'lucide-react';
import { motionSensor } from '@/lib/motion-sensor';
import { getControllerChannel } from '@/lib/realtime-client';
import { audioManager } from '@/engine/AudioManager';

interface MobileControllerProps {
  sessionId: string;
}

type AimMode = 'TOUCHPAD' | 'GYRO';

export const MobileController: React.FC<MobileControllerProps> = ({ sessionId }) => {
  const [aimMode, setAimMode] = useState<AimMode>('TOUCHPAD');
  const [connected, setConnected] = useState(false);
  const [isFiring, setIsFiring] = useState(false);
  const [currentAim, setCurrentAim] = useState({ x: 0, y: 0 });
  const [roundStatus, setRoundStatus] = useState<'PLAYING' | 'ROUND_WON' | 'GAME_OVER' | 'LOBBY'>('LOBBY');
  const [gameState, setGameState] = useState({ score: 0, bullets: 10, level: 1 });
  const [gyroPermissionGranted, setGyroPermissionGranted] = useState(false);

  const touchpadRef = useRef<HTMLDivElement | null>(null);
  const lastAimRef = useRef({ x: 0, y: 0 });
  const aimThrottleRef = useRef<number>(0);
  const lastShotTimeRef = useRef<number>(0);
  const touchStartPosRef = useRef<{ x: number; y: number; time: number } | null>(null);

  // 1. Realtime P2P connection & Room join
  useEffect(() => {
    if (!sessionId) return;
    const channel = getControllerChannel(sessionId);

    const joinRoom = () => {
      channel.emit('room:join', { sessionId });
    };

    const handleConnect = () => {
      setConnected(true);
      joinRoom();
    };

    const handleDisconnect = () => {
      setConnected(false);
    };

    const handleJoined = () => {
      setConnected(true);
    };

    const handleGameSync = (data: Record<string, unknown>) => {
      if (typeof data.status === 'string') {
        setRoundStatus(data.status as 'PLAYING' | 'ROUND_WON' | 'GAME_OVER' | 'LOBBY');
      }
      setGameState((prev) => ({
        score: typeof data.score === 'number' ? data.score : prev.score,
        bullets: typeof data.bullets === 'number' ? data.bullets : prev.bullets,
        level: typeof data.level === 'number' ? data.level : prev.level,
      }));
    };

    channel.on('connect', handleConnect);
    channel.on('disconnect', handleDisconnect);
    channel.on('room:joined', handleJoined);
    channel.on('game:sync', handleGameSync);

    if (channel.isConnected) {
      handleConnect();
    }

    return () => {
      channel.off('connect', handleConnect);
      channel.off('disconnect', handleDisconnect);
      channel.off('room:joined', handleJoined);
      channel.off('game:sync', handleGameSync);
    };
  }, [sessionId]);

  // Send aim update to desktop
  const sendAimUpdate = useCallback(
    (x: number, y: number) => {
      const clampedX = Number(Math.max(-1, Math.min(1, x)).toFixed(4));
      const clampedY = Number(Math.max(-1, Math.min(1, y)).toFixed(4));

      lastAimRef.current = { x: clampedX, y: clampedY };
      setCurrentAim({ x: clampedX, y: clampedY });

      const now = Date.now();
      if (now - aimThrottleRef.current >= 16) {
        aimThrottleRef.current = now;
        const channel = getControllerChannel(sessionId);
        channel.emit('motion:aim', {
          sessionId,
          x: clampedX,
          y: clampedY,
          timestamp: now,
        });
      }
    },
    [sessionId]
  );

  // 2. Fire Trigger Action (with debounce deduplication)
  const fireShot = useCallback(() => {
    const now = Date.now();
    if (now - lastShotTimeRef.current < 150) return;
    lastShotTimeRef.current = now;

    setIsFiring(true);
    setTimeout(() => setIsFiring(false), 90);

    motionSensor.triggerHaptic(45);
    audioManager.playSound('click');

    const channel = getControllerChannel(sessionId);
    channel.emit('controller:trigger', {
      sessionId,
      x: lastAimRef.current.x,
      y: lastAimRef.current.y,
      timestamp: now,
    });
  }, [sessionId]);

  // 3. Gyroscope setup & calibration
  const handleEnableGyro = async () => {
    const granted = await motionSensor.requestPermissions();
    if (granted) {
      setGyroPermissionGranted(true);
      setAimMode('GYRO');
      handleCalibrateGyro();
    }
  };

  const handleCalibrateGyro = useCallback(() => {
    if (typeof window === 'undefined') return;

    const onOrientation = (event: DeviceOrientationEvent) => {
      if (event.beta !== null && event.gamma !== null) {
        motionSensor.calibrate(event.beta, event.gamma, event.alpha);
        window.removeEventListener('deviceorientation', onOrientation);

        motionSensor.startListening((coords) => {
          if (aimMode === 'GYRO') {
            sendAimUpdate(coords.x, coords.y);
          }
        });

        const channel = getControllerChannel(sessionId);
        channel.emit('controller:calibrated', { sessionId });
      }
    };

    window.addEventListener('deviceorientation', onOrientation, { passive: true, once: true });
  }, [aimMode, sendAimUpdate, sessionId]);

  // Switch between Touchpad and Gyro
  const handleSelectMode = (mode: AimMode) => {
    setAimMode(mode);
    if (mode === 'GYRO') {
      if (!gyroPermissionGranted) {
        handleEnableGyro();
      } else {
        handleCalibrateGyro();
      }
    } else {
      motionSensor.stopListening();
    }
  };

  // 4. Touchpad Touch & Drag to Aim handlers
  const handleTouchpadTouch = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!touchpadRef.current) return;
    const rect = touchpadRef.current.getBoundingClientRect();
    const touch = e.touches[0];
    if (!touch) return;

    // Calculate normalized [-1, 1] relative to touchpad area
    const touchX = ((touch.clientX - rect.left) / rect.width) * 2 - 1;
    const touchY = ((touch.clientY - rect.top) / rect.height) * 2 - 1;

    sendAimUpdate(touchX, touchY);
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    const touch = e.touches[0];
    if (touch) {
      touchStartPosRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };
    }
    handleTouchpadTouch(e);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    handleTouchpadTouch(e);
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (touchStartPosRef.current) {
      const touch = e.changedTouches[0];
      if (touch) {
        const dx = Math.abs(touch.clientX - touchStartPosRef.current.x);
        const dy = Math.abs(touch.clientY - touchStartPosRef.current.y);
        const dt = Date.now() - touchStartPosRef.current.time;

        // If quick tap with small movement (<15px and <300ms), trigger shot
        if (dx < 15 && dy < 15 && dt < 300) {
          fireShot();
        }
      }
      touchStartPosRef.current = null;
    }
  };

  // 5. Send Game Command (Next Level / Restart)
  const sendGameCommand = (action: 'START' | 'NEXT_LEVEL' | 'RESTART') => {
    const channel = getControllerChannel(sessionId);
    channel.emit('game:command', { sessionId, action });
  };

  return (
    <div className="fixed inset-0 bg-zinc-950 text-zinc-200 font-mono flex flex-col justify-between select-none touch-none overflow-hidden p-3 sm:p-4">
      {/* Top Header: Room & Aim Mode Switcher */}
      <div className="flex flex-col gap-2 border-b border-zinc-800 pb-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-500' : 'bg-rose-500 animate-pulse'}`} />
            <span className="text-xs font-semibold text-zinc-300">ROOM: {sessionId}</span>
          </div>

          {aimMode === 'GYRO' && (
            <button
              onClick={handleCalibrateGyro}
              className="flex items-center gap-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 active:scale-95 text-xs text-amber-400 font-semibold px-2.5 py-1 rounded shadow cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>RE-CENTER</span>
            </button>
          )}
        </div>

        {/* Big Mode Switcher Tabs */}
        <div className="grid grid-cols-2 gap-2 bg-zinc-900/90 p-1 rounded-lg border border-zinc-800">
          <button
            onClick={() => handleSelectMode('TOUCHPAD')}
            className={`flex items-center justify-center gap-2 py-2 rounded-md font-bold text-xs transition cursor-pointer ${
              aimMode === 'TOUCHPAD'
                ? 'bg-emerald-500 text-black shadow-md'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Gamepad2 className="w-4 h-4" />
            <span>Thumb Touchpad</span>
          </button>

          <button
            onClick={() => handleSelectMode('GYRO')}
            className={`flex items-center justify-center gap-2 py-2 rounded-md font-bold text-xs transition cursor-pointer ${
              aimMode === 'GYRO'
                ? 'bg-amber-500 text-black shadow-md'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>Tilt Gyro</span>
          </button>
        </div>
      </div>

      {/* Game HUD Pill */}
      <div className="grid grid-cols-3 gap-2 bg-zinc-900/90 border border-zinc-800 rounded-lg p-2 text-center text-xs my-2">
        <div>
          <div className="text-[10px] text-zinc-500 uppercase font-semibold">LEVEL</div>
          <div className="text-xs sm:text-sm font-bold text-zinc-200">{gameState.level}</div>
        </div>
        <div>
          <div className="text-[10px] text-zinc-500 uppercase font-semibold">BULLETS</div>
          <div className="text-xs sm:text-sm font-bold text-amber-400">{gameState.bullets}</div>
        </div>
        <div>
          <div className="text-[10px] text-zinc-500 uppercase font-semibold">SCORE</div>
          <div className="text-xs sm:text-sm font-bold text-emerald-400">{gameState.score}</div>
        </div>
      </div>

      {/* Main Touchpad / Gyro Aiming Surface */}
      <div className="flex-1 flex flex-col gap-2 relative">
        <div
          ref={touchpadRef}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onClick={fireShot}
          className={`flex-1 rounded-xl border-2 transition-all duration-75 flex flex-col items-center justify-center cursor-crosshair select-none touch-none relative overflow-hidden ${
            isFiring
              ? 'bg-zinc-800 border-zinc-400 shadow-lg'
              : 'bg-zinc-900/80 border-zinc-800 hover:border-zinc-700'
          }`}
        >
          {/* Subtle Grid Lines on Touchpad */}
          <div className="absolute inset-0 opacity-10 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

          {/* Target Crosshair following thumb / gyro */}
          <div
            className="absolute w-12 h-12 rounded-full border-2 border-amber-400/80 bg-amber-400/20 pointer-events-none transition-transform duration-75 flex items-center justify-center shadow-lg"
            style={{
              transform: `translate(${currentAim.x * 90}px, ${currentAim.y * 65}px)`,
            }}
          >
            <Crosshair className="w-6 h-6 text-amber-400" />
          </div>

          <div className="z-10 text-center pointer-events-none">
            <div className="font-bold tracking-wider text-xs sm:text-sm text-zinc-300 uppercase">
              {aimMode === 'TOUCHPAD' ? 'SLIDE THUMB TO AIM • TAP TO SHOOT' : 'TILT PHONE TO AIM • TAP TO SHOOT'}
            </div>
            <div className="text-[11px] text-zinc-400 mt-1">
              Aim X: {currentAim.x} | Y: {currentAim.y}
            </div>
          </div>
        </div>

        {/* Dedicated Tap-to-Shoot Button for extra comfort */}
        <button
          onTouchStart={(e) => {
            e.stopPropagation();
            fireShot();
          }}
          onClick={(e) => {
            e.stopPropagation();
            fireShot();
          }}
          className={`w-full py-4 rounded-xl font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-2 border shadow-lg transition active:scale-95 cursor-pointer ${
            isFiring
              ? 'bg-amber-400 text-black border-amber-300'
              : 'bg-rose-600 hover:bg-rose-500 text-white border-rose-500'
          }`}
        >
          <Crosshair className="w-5 h-5" />
          <span>FIRE SHOT</span>
        </button>
      </div>

      {/* Round Won / Game Over Navigation Actions */}
      {roundStatus === 'ROUND_WON' && (
        <div className="mt-2">
          <button
            onClick={() => sendGameCommand('NEXT_LEVEL')}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-black font-bold text-xs rounded-lg uppercase tracking-wider cursor-pointer active:scale-95 shadow"
          >
            NEXT LEVEL
          </button>
        </div>
      )}

      {roundStatus === 'GAME_OVER' && (
        <div className="mt-2">
          <button
            onClick={() => sendGameCommand('RESTART')}
            className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs rounded-lg uppercase tracking-wider cursor-pointer active:scale-95 border border-zinc-600 shadow"
          >
            RESTART GAME
          </button>
        </div>
      )}

      {/* Footer Info */}
      <div className="text-center text-[10px] text-zinc-500 pt-2 border-t border-zinc-900 flex items-center justify-center gap-1.5">
        <span>Goose Hunter Mobile Controller</span>
      </div>
    </div>
  );
};
