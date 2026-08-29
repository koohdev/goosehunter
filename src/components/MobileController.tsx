'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Crosshair, RotateCcw, Zap, AlertTriangle, ShieldCheck } from 'lucide-react';
import { motionSensor } from '@/lib/motion-sensor';
import { getSocket } from '@/lib/socket-client';
import { audioManager } from '@/engine/AudioManager';

interface MobileControllerProps {
  sessionId: string;
}

type ControllerState = 'PERMISSION' | 'CALIBRATION' | 'READY' | 'ERROR';

export const MobileController: React.FC<MobileControllerProps> = ({ sessionId }) => {
  const [controllerState, setControllerState] = useState<ControllerState>('PERMISSION');
  const [connected, setConnected] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isFiring, setIsFiring] = useState(false);
  const [currentAim, setCurrentAim] = useState({ x: 0, y: 0 });
  const [roundStatus, setRoundStatus] = useState<'PLAYING' | 'ROUND_WON' | 'GAME_OVER' | 'LOBBY'>('LOBBY');
  const [gameState, setGameState] = useState({ score: 0, bullets: 10, level: 1 });

  const lastAimRef = useRef({ x: 0, y: 0 });
  const aimThrottleRef = useRef<number>(0);

  // 1. Socket connection & Room join
  useEffect(() => {
    if (!sessionId) return;
    const socket = getSocket();

    const handleConnect = () => {
      setConnected(true);
      socket.emit('room:join', { sessionId });
    };

    const handleJoined = () => {
      setConnected(true);
    };

    const handleRoomError = (data: { message: string }) => {
      setErrorMessage(data.message || 'Room not found.');
      setControllerState('ERROR');
    };

    const handleGameSync = (data: { action?: string; status?: string; score?: number; bullets?: number; level?: number }) => {
      if (data.status) setRoundStatus(data.status as 'PLAYING' | 'ROUND_WON' | 'GAME_OVER' | 'LOBBY');
      setGameState((prev) => ({
        score: data.score !== undefined ? data.score : prev.score,
        bullets: data.bullets !== undefined ? data.bullets : prev.bullets,
        level: data.level !== undefined ? data.level : prev.level,
      }));
    };

    if (socket.connected) {
      handleConnect();
    } else {
      socket.on('connect', handleConnect);
    }

    socket.on('room:joined', handleJoined);
    socket.on('room:error', handleRoomError);
    socket.on('game:sync', handleGameSync);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('room:joined', handleJoined);
      socket.off('room:error', handleRoomError);
      socket.off('game:sync', handleGameSync);
    };
  }, [sessionId]);

  // 2. Request orientation permissions
  const handleRequestPermission = async () => {
    const granted = await motionSensor.requestPermissions();
    if (granted) {
      setControllerState('CALIBRATION');
    } else {
      setErrorMessage('Motion sensor permission is required to aim. Please enable it in browser settings.');
      setControllerState('ERROR');
    }
  };

  // 3. Calibrate center origin
  const handleCalibrate = useCallback(() => {
    if (typeof window === 'undefined') return;

    const onOrientation = (event: DeviceOrientationEvent) => {
      if (event.beta !== null && event.gamma !== null) {
        motionSensor.calibrate(event.beta, event.gamma);
        window.removeEventListener('deviceorientation', onOrientation);

        // Start continuous streaming
        motionSensor.startListening((coords) => {
          lastAimRef.current = coords;
          setCurrentAim(coords);

          // Stream to socket (throttled to ~60fps / 16ms)
          const now = Date.now();
          if (now - aimThrottleRef.current >= 16) {
            aimThrottleRef.current = now;
            const socket = getSocket();
            socket.emit('motion:aim', {
              sessionId,
              x: coords.x,
              y: coords.y,
              timestamp: coords.timestamp,
            });
          }
        });

        // Notify server that calibration is done
        const socket = getSocket();
        socket.emit('controller:calibrated', { sessionId });
        setControllerState('READY');
        setRoundStatus('PLAYING');
      }
    };

    window.addEventListener('deviceorientation', onOrientation, { passive: true, once: true });
  }, [sessionId]);

  // 4. Fire Trigger
  const handleTriggerPress = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    if (controllerState !== 'READY') return;

    setIsFiring(true);
    setTimeout(() => setIsFiring(false), 100);

    motionSensor.triggerHaptic(40);
    audioManager.playSound('click');

    const socket = getSocket();
    socket.emit('controller:trigger', {
      sessionId,
      x: lastAimRef.current.x,
      y: lastAimRef.current.y,
      timestamp: Date.now(),
    });
  };

  // 5. Send Game Command (Next Level / Restart)
  const sendGameCommand = (action: 'START' | 'NEXT_LEVEL' | 'RESTART') => {
    const socket = getSocket();
    socket.emit('game:command', { sessionId, action });
  };

  return (
    <div className="fixed inset-0 bg-zinc-950 text-zinc-200 font-mono flex flex-col justify-between select-none touch-none overflow-hidden p-4">
      {/* Top Controller Bar */}
      <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-500' : 'bg-amber-500'}`} />
          <span className="text-xs font-semibold text-zinc-300">ROOM: {sessionId}</span>
          <span className="text-[10px] text-zinc-500 font-medium uppercase">
            {connected ? 'CONNECTED' : 'CONNECTING...'}
          </span>
        </div>

        {controllerState === 'READY' && (
          <button
            onClick={handleCalibrate}
            className="flex items-center gap-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 active:scale-95 text-xs text-amber-400 font-semibold px-3 py-1.5 rounded shadow"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>RE-CENTER</span>
          </button>
        )}
      </div>

      {/* Screen 1: Request Sensor Permissions */}
      {controllerState === 'PERMISSION' && (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-6 gap-6">
          <div className="w-16 h-16 rounded-full bg-zinc-900 border border-zinc-700 flex items-center justify-center text-zinc-300 shadow">
            <Zap className="w-8 h-8 text-amber-400" />
          </div>

          <div>
            <h2 className="text-xl font-bold text-zinc-100 mb-2">MOTION LIGHT GUN</h2>
            <p className="text-zinc-400 text-xs max-w-xs mx-auto leading-relaxed">
              Enable gyroscope access to control the aiming reticle by moving your phone.
            </p>
          </div>

          <button
            onClick={handleRequestPermission}
            className="w-full max-w-xs py-3.5 bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-zinc-100 font-bold text-xs tracking-wider rounded-lg shadow border border-zinc-600 uppercase"
          >
            Enable Motion Sensors
          </button>
        </div>
      )}

      {/* Screen 2: Point & Calibrate */}
      {controllerState === 'CALIBRATION' && (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-6 gap-6">
          <div className="w-20 h-20 rounded-full bg-zinc-900 border border-zinc-700 flex items-center justify-center text-amber-400 shadow">
            <Crosshair className="w-10 h-10" />
          </div>

          <div>
            <h2 className="text-xl font-bold text-zinc-100 mb-2">CALIBRATION</h2>
            <p className="text-zinc-400 text-xs max-w-xs mx-auto leading-relaxed">
              Point phone directly at the center of the screen, then tap Calibrate below.
            </p>
          </div>

          <button
            onClick={handleCalibrate}
            className="w-full max-w-xs py-3.5 bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-zinc-100 font-bold text-xs tracking-wider rounded-lg shadow border border-zinc-600 uppercase"
          >
            Calibrate Center Origin
          </button>
        </div>
      )}

      {/* Screen 3: Active Gameplay Gun Controller */}
      {controllerState === 'READY' && (
        <div className="flex-1 flex flex-col justify-between py-2 gap-4">
          {/* Controller HUD Pill */}
          <div className="grid grid-cols-3 gap-2 bg-zinc-900/90 border border-zinc-800 rounded-lg p-2.5 text-center text-xs">
            <div>
              <div className="text-[10px] text-zinc-500 uppercase font-semibold">LEVEL</div>
              <div className="text-sm font-bold text-zinc-200">{gameState.level}</div>
            </div>
            <div>
              <div className="text-[10px] text-zinc-500 uppercase font-semibold">BULLETS</div>
              <div className="text-sm font-bold text-amber-400">{gameState.bullets}</div>
            </div>
            <div>
              <div className="text-[10px] text-zinc-500 uppercase font-semibold">SCORE</div>
              <div className="text-sm font-bold text-emerald-400">{gameState.score}</div>
            </div>
          </div>

          {/* Large Touch Trigger Surface */}
          <div
            onTouchStart={handleTriggerPress}
            onMouseDown={handleTriggerPress}
            className={`flex-1 rounded-xl border-2 transition-all duration-75 flex flex-col items-center justify-center cursor-pointer active:scale-[0.99] ${
              isFiring
                ? 'bg-zinc-800 border-zinc-500 shadow-md'
                : 'bg-zinc-900/80 border-zinc-800'
            }`}
          >
            <div className={`p-5 rounded-full border transition-all ${isFiring ? 'border-zinc-300 bg-zinc-700' : 'border-zinc-700 bg-zinc-950'}`}>
              <Crosshair className={`w-12 h-12 ${isFiring ? 'text-zinc-100' : 'text-zinc-400'}`} />
            </div>

            <div className="mt-3 font-bold tracking-wider text-xs text-zinc-300 uppercase">
              {isFiring ? 'FIRED' : 'TAP TO FIRE'}
            </div>

            <div className="text-[10px] text-zinc-500 mt-1">
              Aim X: {currentAim.x} | Y: {currentAim.y}
            </div>
          </div>

          {/* Navigation buttons when round concludes */}
          {roundStatus === 'ROUND_WON' && (
            <div className="flex gap-2">
              <button
                onClick={() => sendGameCommand('NEXT_LEVEL')}
                className="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 active:scale-95 font-bold text-xs text-zinc-100 rounded-lg uppercase"
              >
                NEXT LEVEL
              </button>
            </div>
          )}

          {roundStatus === 'GAME_OVER' && (
            <div className="flex gap-2">
              <button
                onClick={() => sendGameCommand('RESTART')}
                className="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 active:scale-95 font-bold text-xs text-zinc-100 rounded-lg uppercase"
              >
                RESTART GAME
              </button>
            </div>
          )}
        </div>
      )}

      {/* Screen 4: Error State */}
      {controllerState === 'ERROR' && (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-6 gap-4">
          <AlertTriangle className="w-10 h-10 text-amber-500" />
          <h3 className="text-base font-bold text-zinc-200">Connection Error</h3>
          <p className="text-zinc-400 text-xs max-w-xs">{errorMessage || 'Unable to connect to game session.'}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-5 py-2 bg-zinc-800 border border-zinc-700 text-zinc-200 rounded text-xs font-semibold"
          >
            Retry Connection
          </button>
        </div>
      )}

      {/* Footer Info */}
      <div className="text-center text-[10px] text-zinc-500 pt-2 border-t border-zinc-900 flex items-center justify-center gap-1">
        <ShieldCheck className="w-3 h-3 text-zinc-400" /> Web Motion Light Gun • Goose Hunter
      </div>
    </div>
  );
};
