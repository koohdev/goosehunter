'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Crosshair, RotateCcw, Zap, AlertTriangle, RefreshCw, Smartphone, Sliders } from 'lucide-react';
import { motionSensor, GripMode } from '@/lib/motion-sensor';
import { getControllerChannel } from '@/lib/realtime-client';
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

  // Grip & Sensitivity controls
  const [gripMode, setGripMode] = useState<GripMode>('GUN_LANDSCAPE');
  const [sensitivityPreset, setSensitivityPreset] = useState<'LOW' | 'NORMAL' | 'HIGH'>('NORMAL');
  const [invertY, setInvertY] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const lastAimRef = useRef({ x: 0, y: 0 });
  const aimThrottleRef = useRef<number>(0);

  // Sync motion sensor configuration
  const updateMotionConfig = useCallback(
    (newGrip: GripMode, preset: 'LOW' | 'NORMAL' | 'HIGH', invY: boolean) => {
      const sensitivities = {
        LOW: { x: 34, y: 26 },
        NORMAL: { x: 26, y: 20 },
        HIGH: { x: 18, y: 14 },
      };
      const s = sensitivities[preset];
      motionSensor.setConfig({
        gripMode: newGrip,
        sensitivityX: s.x,
        sensitivityY: s.y,
        invertY: invY,
      });
    },
    []
  );

  useEffect(() => {
    updateMotionConfig(gripMode, sensitivityPreset, invertY);
  }, [gripMode, sensitivityPreset, invertY, updateMotionConfig]);

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
      setErrorMessage('');
      setControllerState((prev) => (prev === 'ERROR' ? 'PERMISSION' : prev));
    };

    const handleRoomError = (data: Record<string, unknown>) => {
      const message = typeof data.message === 'string' ? data.message : 'Room not found.';
      setErrorMessage(message);
      setControllerState('ERROR');
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
    channel.on('room:error', handleRoomError);
    channel.on('game:sync', handleGameSync);

    if (channel.isConnected) {
      handleConnect();
    }

    return () => {
      channel.off('connect', handleConnect);
      channel.off('disconnect', handleDisconnect);
      channel.off('room:joined', handleJoined);
      channel.off('room:error', handleRoomError);
      channel.off('game:sync', handleGameSync);
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

  // 3. Calibrate center origin (3D matrix calibration)
  const handleCalibrate = useCallback(() => {
    if (typeof window === 'undefined') return;

    const onOrientation = (event: DeviceOrientationEvent) => {
      if (event.beta !== null && event.gamma !== null) {
        motionSensor.calibrate(event.beta, event.gamma, event.alpha);
        window.removeEventListener('deviceorientation', onOrientation);

        // Start continuous streaming
        motionSensor.startListening((coords) => {
          lastAimRef.current = coords;
          setCurrentAim(coords);

          // Stream to channel (throttled to ~60fps / 16ms)
          const now = Date.now();
          if (now - aimThrottleRef.current >= 16) {
            aimThrottleRef.current = now;
            const channel = getControllerChannel(sessionId);
            channel.emit('motion:aim', {
              sessionId,
              x: coords.x,
              y: coords.y,
              timestamp: coords.timestamp,
            });
          }
        });

        // Notify server that calibration is done
        const channel = getControllerChannel(sessionId);
        channel.emit('controller:calibrated', { sessionId });
        setControllerState('READY');
        setRoundStatus('PLAYING');
      }
    };

    window.addEventListener('deviceorientation', onOrientation, { passive: true, once: true });
  }, [sessionId]);

  // 4. Fire Trigger on screen tap
  const handleTriggerPress = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    if (controllerState !== 'READY') return;

    setIsFiring(true);
    setTimeout(() => setIsFiring(false), 90);

    motionSensor.triggerHaptic(45);
    audioManager.playSound('click');

    const channel = getControllerChannel(sessionId);
    channel.emit('controller:trigger', {
      sessionId,
      x: lastAimRef.current.x,
      y: lastAimRef.current.y,
      timestamp: Date.now(),
    });
  };

  // 5. Send Game Command (Next Level / Restart)
  const sendGameCommand = (action: 'START' | 'NEXT_LEVEL' | 'RESTART') => {
    const channel = getControllerChannel(sessionId);
    channel.emit('game:command', { sessionId, action });
  };

  const handleRetryJoin = () => {
    setErrorMessage('');
    const channel = getControllerChannel(sessionId);
    channel.connect();
    channel.emit('room:join', { sessionId });
    setControllerState('PERMISSION');
  };

  return (
    <div className="fixed inset-0 bg-zinc-950 text-zinc-200 font-mono flex flex-col justify-between select-none touch-none overflow-hidden p-3 sm:p-4">
      {/* Top Controller Status Bar */}
      <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-500' : 'bg-rose-500 animate-pulse'}`} />
          <span className="text-xs font-semibold text-zinc-300">ROOM: {sessionId}</span>
          <span className="text-[10px] text-zinc-500 font-medium uppercase">
            {connected ? 'CONNECTED' : 'DISCONNECTED'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSettings((prev) => !prev)}
            className="flex items-center gap-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 active:scale-95 text-xs text-zinc-300 px-2.5 py-1 rounded shadow cursor-pointer"
            title="Grip & Sensitivity settings"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span className="text-[10px] uppercase">{sensitivityPreset}</span>
          </button>

          {controllerState === 'READY' && (
            <button
              onClick={handleCalibrate}
              className="flex items-center gap-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 active:scale-95 text-xs text-amber-400 font-semibold px-3 py-1 rounded shadow cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>RE-CENTER</span>
            </button>
          )}
        </div>
      </div>

      {/* Settings Modal Drawer */}
      {showSettings && (
        <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-3.5 my-2 flex flex-col gap-3 text-xs shadow-xl animate-in fade-in duration-150">
          <div className="flex items-center justify-between font-bold text-zinc-100 border-b border-zinc-800 pb-1.5">
            <span>MOTION SETTINGS</span>
            <button onClick={() => setShowSettings(false)} className="text-zinc-400 hover:text-zinc-100 text-xs px-2 py-0.5">
              Done
            </button>
          </div>

          {/* Grip Mode */}
          <div>
            <div className="text-[10px] text-zinc-400 uppercase font-semibold mb-1">Grip Style</div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setGripMode('GUN_LANDSCAPE')}
                className={`py-2 px-2 rounded text-[11px] font-bold border transition ${
                  gripMode === 'GUN_LANDSCAPE'
                    ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                    : 'bg-zinc-800 border-zinc-700 text-zinc-400'
                }`}
              >
                🔫 Landscape Gun
              </button>
              <button
                onClick={() => setGripMode('POINTER_TOP')}
                className={`py-2 px-2 rounded text-[11px] font-bold border transition ${
                  gripMode === 'POINTER_TOP'
                    ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                    : 'bg-zinc-800 border-zinc-700 text-zinc-400'
                }`}
              >
                🎯 Top Pointer
              </button>
            </div>
          </div>

          {/* Sensitivity Preset */}
          <div>
            <div className="text-[10px] text-zinc-400 uppercase font-semibold mb-1">Sensitivity</div>
            <div className="grid grid-cols-3 gap-1.5">
              {(['LOW', 'NORMAL', 'HIGH'] as const).map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => setSensitivityPreset(lvl)}
                  className={`py-1.5 rounded text-[10px] font-bold border transition ${
                    sensitivityPreset === lvl
                      ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                      : 'bg-zinc-800 border-zinc-700 text-zinc-400'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>

          {/* Invert Y Axis */}
          <div className="flex items-center justify-between pt-1 border-t border-zinc-800/80">
            <span className="text-[11px] text-zinc-300">Invert Y Axis (Vertical)</span>
            <button
              onClick={() => setInvertY((prev) => !prev)}
              className={`px-3 py-1 rounded text-[10px] font-bold border ${
                invertY ? 'bg-amber-500/20 border-amber-400 text-amber-300' : 'bg-zinc-800 border-zinc-700 text-zinc-400'
              }`}
            >
              {invertY ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>
      )}

      {/* Screen 1: Request Sensor Permissions */}
      {controllerState === 'PERMISSION' && (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-4 gap-4 sm:gap-6">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-zinc-900 border border-zinc-700 flex items-center justify-center text-zinc-300 shadow">
            <Zap className="w-7 h-7 sm:w-8 sm:h-8 text-amber-400" />
          </div>

          <div>
            <h2 className="text-lg sm:text-xl font-bold text-zinc-100 mb-1.5">LANDSCAPE GUN CONTROLLER</h2>
            <p className="text-zinc-400 text-xs max-w-xs mx-auto leading-relaxed">
              Hold phone horizontally on its side like a light gun. Aim at the screen and tap anywhere to shoot.
            </p>
          </div>

          <button
            onClick={handleRequestPermission}
            className="w-full max-w-xs py-3 bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-zinc-100 font-bold text-xs tracking-wider rounded-lg shadow border border-zinc-600 uppercase cursor-pointer"
          >
            Enable Motion Sensors
          </button>
        </div>
      )}

      {/* Screen 2: Point & Calibrate */}
      {controllerState === 'CALIBRATION' && (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-4 gap-4 sm:gap-6">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-zinc-900 border border-zinc-700 flex items-center justify-center text-amber-400 shadow">
            <Crosshair className="w-8 h-8 sm:w-10 sm:h-10" />
          </div>

          <div>
            <h2 className="text-lg sm:text-xl font-bold text-zinc-100 mb-1.5">CALIBRATE AIM</h2>
            <p className="text-zinc-400 text-xs max-w-sm mx-auto leading-relaxed">
              Hold phone horizontally in your gun grip, point directly at the <span className="text-amber-400 font-bold">center of your screen</span>, then tap Calibrate below.
            </p>
          </div>

          {/* Quick Grip selector on calibration screen */}
          <div className="flex items-center justify-center gap-2 w-full max-w-xs">
            <button
              onClick={() => setGripMode('GUN_LANDSCAPE')}
              className={`flex-1 py-1.5 px-2 rounded text-[11px] font-bold border transition ${
                gripMode === 'GUN_LANDSCAPE'
                  ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                  : 'bg-zinc-900 border-zinc-700 text-zinc-400'
              }`}
            >
              🔫 Landscape Gun
            </button>
            <button
              onClick={() => setGripMode('POINTER_TOP')}
              className={`flex-1 py-1.5 px-2 rounded text-[11px] font-bold border transition ${
                gripMode === 'POINTER_TOP'
                  ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                  : 'bg-zinc-900 border-zinc-700 text-zinc-400'
              }`}
            >
              🎯 Top Pointer
            </button>
          </div>

          <button
            onClick={handleCalibrate}
            className="w-full max-w-xs py-3.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-black font-bold text-xs tracking-wider rounded-lg shadow-lg uppercase cursor-pointer"
          >
            Calibrate Center Origin
          </button>
        </div>
      )}

      {/* Screen 3: Active Gameplay Gun Controller (Full Touch Trigger Surface) */}
      {controllerState === 'READY' && (
        <div className="flex-1 flex flex-col justify-between py-1.5 gap-2 sm:gap-3">
          {/* Controller HUD Pill */}
          <div className="grid grid-cols-3 gap-2 bg-zinc-900/90 border border-zinc-800 rounded-lg p-2 text-center text-xs">
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

          {/* Large Landscape Touch Trigger Surface */}
          <div
            onTouchStart={handleTriggerPress}
            onMouseDown={handleTriggerPress}
            className={`flex-1 rounded-xl border-2 transition-all duration-75 flex flex-col items-center justify-center cursor-pointer active:scale-[0.99] select-none touch-none relative overflow-hidden ${
              isFiring
                ? 'bg-zinc-800 border-zinc-400 shadow-md'
                : 'bg-zinc-900/80 border-zinc-800 hover:border-zinc-700'
            }`}
          >
            {/* Live Aim Position Dot Preview in Background */}
            <div
              className="absolute w-6 h-6 rounded-full border border-amber-400/50 bg-amber-400/20 pointer-events-none transition-transform duration-75"
              style={{
                transform: `translate(${currentAim.x * 60}px, ${currentAim.y * 40}px)`,
              }}
            />

            <div
              className={`p-4 sm:p-5 rounded-full border transition-all z-10 ${
                isFiring ? 'border-zinc-200 bg-zinc-700' : 'border-zinc-700 bg-zinc-950'
              }`}
            >
              <Crosshair className={`w-10 h-10 sm:w-12 sm:h-12 ${isFiring ? 'text-zinc-100' : 'text-zinc-400'}`} />
            </div>

            <div className="mt-2.5 font-bold tracking-wider text-xs sm:text-sm text-zinc-300 uppercase z-10">
              {isFiring ? 'SHOT FIRED' : 'TAP SCREEN TO SHOOT'}
            </div>

            <div className="text-[10px] text-zinc-500 mt-0.5 z-10">
              Aim X: {currentAim.x} | Y: {currentAim.y}
            </div>
          </div>

          {/* Navigation buttons when round concludes */}
          {roundStatus === 'ROUND_WON' && (
            <div className="flex gap-2">
              <button
                onClick={() => sendGameCommand('NEXT_LEVEL')}
                className="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 active:scale-95 font-bold text-xs text-zinc-100 rounded-lg uppercase cursor-pointer"
              >
                NEXT LEVEL
              </button>
            </div>
          )}

          {roundStatus === 'GAME_OVER' && (
            <div className="flex gap-2">
              <button
                onClick={() => sendGameCommand('RESTART')}
                className="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 active:scale-95 font-bold text-xs text-zinc-100 rounded-lg uppercase cursor-pointer"
              >
                RESTART GAME
              </button>
            </div>
          )}
        </div>
      )}

      {/* Screen 4: Error State */}
      {controllerState === 'ERROR' && (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-4 gap-3.5">
          <AlertTriangle className="w-10 h-10 text-amber-500" />
          <h3 className="text-sm font-bold text-zinc-200">Connection Error</h3>
          <p className="text-zinc-400 text-xs max-w-xs">{errorMessage || 'Unable to connect to game session.'}</p>
          <button
            onClick={handleRetryJoin}
            className="flex items-center gap-1.5 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 text-zinc-100 font-bold rounded-lg text-xs cursor-pointer active:scale-95 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry Connection</span>
          </button>
        </div>
      )}

      {/* Footer Info */}
      <div className="text-center text-[10px] text-zinc-500 pt-1.5 border-t border-zinc-900 flex items-center justify-center gap-1.5">
        <Smartphone className="w-3 h-3 text-zinc-400" /> {gripMode === 'GUN_LANDSCAPE' ? 'Landscape Gun Grip' : 'Top Pointer'} • Tap anywhere to fire
      </div>
    </div>
  );
};
