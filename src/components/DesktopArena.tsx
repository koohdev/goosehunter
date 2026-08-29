'use client';

import React, { useEffect, useRef, useState } from 'react';
import { GameEngine } from '@/engine/GameEngine';
import { LevelManager, LEVEL_CONFIGS } from '@/engine/LevelManager';
import { ArcadeHUD } from '@/components/ArcadeHUD';
import { VictoryModal } from '@/components/VictoryModal';
import { getHostChannel } from '@/lib/realtime-client';
import { audioManager } from '@/engine/AudioManager';
import { GameRoundState, LevelConfig } from '@/lib/types';

interface DesktopArenaProps {
  sessionId: string;
  isSoloMouse: boolean;
  onExitToLobby: () => void;
  onToggleSoloMode: () => void;
}

const initialGameState: GameRoundState = {
  currentLevel: 1,
  score: 0,
  highScore: 0,
  bulletsRemaining: 10,
  missedShots: 0,
  shotsFired: 0,
  geeseHit: 0,
  status: 'LOBBY',
  isSoloMouseMode: false,
  soundEnabled: true,
};

export const DesktopArena: React.FC<DesktopArenaProps> = ({
  sessionId,
  isSoloMouse,
  onExitToLobby,
  onToggleSoloMode,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const levelManagerRef = useRef<LevelManager>(new LevelManager());

  const [gameState, setGameState] = useState<GameRoundState>(initialGameState);
  const [levelConfig, setLevelConfig] = useState<LevelConfig>(LEVEL_CONFIGS[1]);

  const nextLevel = () => {
    if (!engineRef.current) return;
    const current = levelManagerRef.current.getState().currentLevel;
    const nextLvl = current < 5 ? current + 1 : 1;
    engineRef.current.loadLevel(nextLvl);
    setGameState(levelManagerRef.current.getState());
    setLevelConfig(levelManagerRef.current.getCurrentConfig());
  };

  const restartLevel = () => {
    if (!engineRef.current) return;
    const current = levelManagerRef.current.getState().currentLevel;
    engineRef.current.loadLevel(current);
    setGameState(levelManagerRef.current.getState());
    setLevelConfig(levelManagerRef.current.getCurrentConfig());
  };

  // 1. Initialize Engine & Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set native background resolution
    canvas.width = 800;
    canvas.height = 570;

    const lm = levelManagerRef.current;
    lm.setSoloMouseMode(isSoloMouse);
    lm.startRound(1);

    const engine = new GameEngine(lm);
    engineRef.current = engine;

    engine.init(canvas, (updatedState) => {
      setGameState(updatedState);
      setLevelConfig(lm.getCurrentConfig());

      // Sync state to mobile controller
      const channel = getHostChannel();
      channel.emit('game:sync', {
        sessionId,
        status: updatedState.status,
        score: updatedState.score,
        bullets: updatedState.bulletsRemaining,
        level: updatedState.currentLevel,
      });
    });

    audioManager.preloadSounds().then(() => {
      audioManager.startBgm();
      audioManager.playSound('start');
    });

    return () => {
      audioManager.stopBgm();
      engine.destroy();
    };
  }, [isSoloMouse, sessionId]);

  // Update solo mode when prop changes
  useEffect(() => {
    if (levelManagerRef.current) {
      levelManagerRef.current.setSoloMouseMode(isSoloMouse);
      setGameState(levelManagerRef.current.getState());
    }
  }, [isSoloMouse]);

  // 2. Realtime Listeners for Motion Aiming & Trigger
  useEffect(() => {
    const channel = getHostChannel();

    const handleAimUpdate = (data: Record<string, unknown>) => {
      const x = typeof data.x === 'number' ? data.x : 0;
      const y = typeof data.y === 'number' ? data.y : 0;
      if (engineRef.current && !levelManagerRef.current.getState().isSoloMouseMode) {
        engineRef.current.setNormalizedAim(x, y);
      }
    };

    const handleTriggerFired = () => {
      if (engineRef.current && !levelManagerRef.current.getState().isSoloMouseMode) {
        engineRef.current.fireShot();
      }
    };

    const handleGameCommand = (data: Record<string, unknown>) => {
      if (data.action === 'NEXT_LEVEL') {
        nextLevel();
      } else if (data.action === 'RESTART') {
        restartLevel();
      }
    };

    channel.on('aim:update', handleAimUpdate);
    channel.on('trigger:fired', handleTriggerFired);
    channel.on('game:sync', handleGameCommand);

    return () => {
      channel.off('aim:update', handleAimUpdate);
      channel.off('trigger:fired', handleTriggerFired);
      channel.off('game:sync', handleGameCommand);
    };
  }, [sessionId]);

  // 3. Mouse Aiming & Shooting (Solo Mode)
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!gameState.isSoloMouseMode || !engineRef.current || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;

    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    engineRef.current.setPixelAim(x, y);
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    audioManager.resumeContext();
    if (!gameState.isSoloMouseMode || !engineRef.current) return;
    e.preventDefault();
    engineRef.current.fireShot();
  };

  const handleToggleSound = () => {
    const next = !gameState.soundEnabled;
    audioManager.setEnabled(next);
    levelManagerRef.current.setSoundEnabled(next);
    setGameState(levelManagerRef.current.getState());
  };

  return (
    <div className="relative w-full max-w-4xl mx-auto flex flex-col items-center select-none font-mono">
      {/* Top Banner: Level Info & Control Toggles */}
      <ArcadeHUD
        state={gameState}
        config={levelConfig}
        onToggleSound={handleToggleSound}
        onToggleSoloMode={onToggleSoloMode}
        variant="top"
      />

      {/* 2D Canvas Game Arena Container */}
      <div className="relative w-full aspect-[800/570] bg-black border-4 border-zinc-800 rounded-xl overflow-hidden shadow-2xl mt-2 cursor-crosshair">
        <canvas
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onMouseDown={handleMouseDown}
          className="w-full h-full block image-pixelated"
        />

        {/* Bottom Arcade Scoreboard HUD (INSIDE the arena, over the bottom bar!) */}
        <div className="absolute bottom-2 inset-x-2 sm:inset-x-3 pointer-events-none z-20">
          <ArcadeHUD
            state={gameState}
            config={levelConfig}
            variant="bottom"
          />
        </div>

        {/* Victory / Game Over Overlay */}
        <VictoryModal
          state={gameState}
          config={levelConfig}
          onNextLevel={nextLevel}
          onRestart={restartLevel}
          onExitToLobby={onExitToLobby}
        />
      </div>
    </div>
  );
};
