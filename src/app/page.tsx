'use client';

import React, { useState, useEffect } from 'react';
import { QrPairingLobby } from '@/components/QrPairingLobby';
import { DesktopArena } from '@/components/DesktopArena';
import { getSocket } from '@/lib/socket-client';
import { audioManager } from '@/engine/AudioManager';

export default function DesktopPage() {
  const [sessionId, setSessionId] = useState<string>('');
  const [controllerConnected, setControllerConnected] = useState<boolean>(false);
  const [inGame, setInGame] = useState<boolean>(false);
  const [isSoloMouse, setIsSoloMouse] = useState<boolean>(false);

  useEffect(() => {
    const socket = getSocket();

    const handleRoomCreated = (data: { sessionId: string }) => {
      setSessionId(data.sessionId);
    };

    const handleControllerConnected = () => {
      setControllerConnected(true);
    };

    const handleControllerCalibrated = () => {
      setControllerConnected(true);
      setInGame(true);
      setIsSoloMouse(false);
      audioManager.resumeContext();
      audioManager.startBgm();
    };

    const handleControllerDisconnected = () => {
      setControllerConnected(false);
    };

    if (socket.connected) {
      socket.emit('room:create');
    } else {
      socket.on('connect', () => {
        socket.emit('room:create');
      });
    }

    socket.on('room:created', handleRoomCreated);
    socket.on('controller:connected', handleControllerConnected);
    socket.on('controller:calibrated', handleControllerCalibrated);
    socket.on('controller:disconnected', handleControllerDisconnected);

    return () => {
      socket.off('room:created', handleRoomCreated);
      socket.off('controller:connected', handleControllerConnected);
      socket.off('controller:calibrated', handleControllerCalibrated);
      socket.off('controller:disconnected', handleControllerDisconnected);
    };
  }, []);

  const handleStartSoloMouse = () => {
    audioManager.resumeContext();
    audioManager.startBgm();
    setIsSoloMouse(true);
    setInGame(true);
  };

  const handleExitToLobby = () => {
    setInGame(false);
    setIsSoloMouse(false);
    // Request fresh room
    const socket = getSocket();
    socket.emit('room:create');
  };

  const handleToggleSoloMode = () => {
    setIsSoloMouse((prev) => !prev);
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center p-4 relative overflow-hidden font-mono">
      {/* Retro Arcade Ambient Glow Background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-emerald-950/20 via-black to-zinc-950 pointer-events-none" />

      {/* CRT Scanline Overlay Effect */}
      <div className="crt-overlay pointer-events-none absolute inset-0 z-50 opacity-15" />

      {/* Main Switcher: Lobby vs Arena */}
      {!inGame ? (
        <QrPairingLobby
          sessionId={sessionId}
          onStartSoloMouse={handleStartSoloMouse}
          controllerConnected={controllerConnected}
        />
      ) : (
        <DesktopArena
          sessionId={sessionId}
          isSoloMouse={isSoloMouse}
          onExitToLobby={handleExitToLobby}
          onToggleSoloMode={handleToggleSoloMode}
        />
      )}

      {/* Footer Branding */}
      <footer className="mt-4 text-center text-xs text-zinc-500 font-mono tracking-wider">
        GOOSE HUNTER • CROSS-DEVICE MOTION ARCADE SHOOTER
      </footer>
    </main>
  );
}
