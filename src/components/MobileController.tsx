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

    // Visual recoil state
    setIsFiring(true);
    setTimeout(() => setIsFiring(false), 120);

    // Haptic recoil
    motionSensor.triggerHaptic(50);

    // Local trigger sound
    audioManager.playSound('click');

    // Emit fire trigger with current aim position
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
    <div className="fixed inset-0 bg-zinc-950 text-white font-mono flex flex-col justify-between select-none touch-none overflow-hidden p-4">
      {/* Top Controller Bar */}
      <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${connected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
          <span className="text-xs font-bold text-zinc-300">ROOM: {sessionId}</span>
          <span className="text-[10px] text-zinc-500 font-semibold uppercase">
            {connected ? 'CONNECTED' : 'CONNECTING...'}
          </span>
        </div>

        {controllerState === 'READY' && (
          <button
            onClick={handleCalibrate}
            className="flex items-center gap-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 active:scale-95 text-xs text-amber-400 font-bold px-3 py-1.5 rounded-full shadow"
          >
            <RotateCcw className="w-3.5 h-3.5" /> RE-CENTER
          </button>
        )}
      </div>

      {/* Screen 1: Request Sensor Permissions */}
      {controllerState === 'PERMISSION' && (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-6 gap-6">
          <div className="w-20 h-20 rounded-full bg-emerald-950/80 border-2 border-emerald-500 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-900/50">
            <Zap className="w-10 h-10 animate-bounce" />
          </div>

          <div>
            <h2 className="text-2xl font-black text-amber-400 mb-2">MOTION LIGHT GUN</h2>
            <p className="text-zinc-400 text-xs max-w-xs mx-auto">
              Enable gyroscope access so you can aim on the screen by tilting your phone.
            </p>
          </div>

          <button
            onClick={handleRequestPermission}
            className="w-full max-w-xs py-4 bg-gradient-to-r from-emerald-600 to-teal-600 active:scale-95 text-black font-black text-sm tracking-wider rounded-xl shadow-xl border border-emerald-400/60 uppercase"
          >
            Enable Motion Sensors
          </button>
        </div>
      )}

      {/* Screen 2: Point & Calibrate */}
      {controllerState === 'CALIBRATION' && (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-6 gap-6">
          <div className="w-24 h-24 rounded-full bg-amber-950/80 border-2 border-amber-400 flex items-center justify-center text-amber-300 animate-pulse shadow-lg shadow-amber-900/50">
            <Crosshair className="w-12 h-12" />
          </div>

          <div>
            <h2 className="text-2xl font-black text-emerald-400 mb-2">CALIBRATION</h2>
            <p className="text-zinc-300 text-xs max-w-xs mx-auto leading-relaxed">
              Hold phone comfortably, point directly at the <span className="text-yellow-300 font-bold">CENTER of the desktop screen</span>, then tap Calibrate below.
            </p>
          </div>

          <button
            onClick={handleCalibrate}
            className="w-full max-w-xs py-4 bg-gradient-to-r from-amber-500 to-yellow-500 active:scale-95 text-black font-black text-sm tracking-wider rounded-xl shadow-xl border border-yellow-300 uppercase"
          >
            Calibrate Center Origin
          </button>
        </div>
      )}

      {/* Screen 3: Active Gameplay Gun Controller */}
      {controllerState === 'READY' && (
        <div className="flex-1 flex flex-col justify-between py-2 gap-4">
          {/* Controller HUD Pill */}
          <div className="grid grid-cols-3 gap-2 bg-zinc-900/90 border border-zinc-800 rounded-xl p-2.5 text-center text-xs">
            <div>
              <div className="text-[10px] text-zinc-500 uppercase font-semibold">Level</div>
              <div className="text-base font-extrabold text-amber-400">{gameState.level}</div>
            </div>
            <div>
              <div className="text-[10px] text-zinc-500 uppercase font-semibold">Bullets</div>
              <div className="text-base font-extrabold text-sky-400">{gameState.bullets}</div>
            </div>
            <div>
              <div className="text-[10px] text-zinc-500 uppercase font-semibold">Score</div>
              <div className="text-base font-extrabold text-emerald-400">{gameState.score}</div>
            </div>
          </div>

          {/* Large Touch Trigger Surface */}
          <div
            onTouchStart={handleTriggerPress}
            onMouseDown={handleTriggerPress}
            className={`flex-1 rounded-2xl border-4 transition-all duration-75 flex flex-col items-center justify-center cursor-pointer active:scale-[0.98] ${
              isFiring
                ? 'bg-rose-600/90 border-rose-400 shadow-[0_0_50px_rgba(244,63,94,0.8)]'
                : 'bg-gradient-to-b from-zinc-900 to-black border-zinc-700 shadow-inner'
            }`}
          >
            <div className={`p-6 rounded-full border-2 transition-all ${isFiring ? 'border-white bg-rose-500 scale-110' : 'border-rose-500/60 bg-rose-950/30'}`}>
              <Crosshair className={`w-16 h-16 transition-colors ${isFiring ? 'text-white' : 'text-rose-400'}`} />
            </div>

            <div className="mt-4 font-black tracking-widest text-lg text-rose-400 uppercase drop-shadow">
              {isFiring ? 'BANG!!' : 'TAP ANYWHERE TO FIRE'}
            </div>

            <div className="text-[10px] text-zinc-500 mt-1">
              Aim X: {currentAim.x} | Y: {currentAim.y}
            </div>
          </div>

          {/* Quick Round Navigation Modal sync for mobile */}
          {roundStatus === 'ROUND_WON' && (
            <div className="flex gap-2">
              <button
                onClick={() => sendGameCommand('NEXT_LEVEL')}
                className="flex-1 py-3 bg-emerald-600 active:scale-95 font-black text-xs text-black rounded-lg uppercase"
              >
                Next Level
              </button>
            </div>
          )}

          {roundStatus === 'GAME_OVER' && (
            <div className="flex gap-2">
              <button
                onClick={() => sendGameCommand('RESTART')}
                className="flex-1 py-3 bg-rose-600 active:scale-95 font-black text-xs text-white rounded-lg uppercase"
              >
                Restart Game
              </button>
            </div>
          )}
        </div>
      )}

      {/* Screen 4: Error State */}
      {controllerState === 'ERROR' && (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-6 gap-4">
          <AlertTriangle className="w-12 h-12 text-rose-500" />
          <h3 className="text-lg font-bold text-rose-400">Connection Error</h3>
          <p className="text-zinc-400 text-xs max-w-xs">{errorMessage || 'Unable to connect to game session.'}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2.5 bg-zinc-800 border border-zinc-700 text-white rounded-lg text-xs font-bold"
          >
            Retry Connection
          </button>
        </div>
      )}

      {/* Footer Info */}
      <div className="text-center text-[10px] text-zinc-600 pt-2 border-t border-zinc-900 flex items-center justify-center gap-1">
        <ShieldCheck className="w-3 h-3 text-emerald-500" /> Web Motion Light Gun • Goose Hunter
      </div>
    </div>
  );
};
