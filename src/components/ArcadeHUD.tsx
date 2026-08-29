'use client';

import React from 'react';
import { GameRoundState, LevelConfig } from '@/lib/types';

interface ArcadeHUDProps {
  state: GameRoundState;
  config: LevelConfig;
  onToggleSound?: () => void;
  onToggleSoloMode?: () => void;
  variant?: 'top' | 'bottom';
}

export const ArcadeHUD: React.FC<ArcadeHUDProps> = ({
  state,
  config,
  onToggleSound,
  onToggleSoloMode,
  variant = 'bottom',
}) => {
  if (variant === 'top') {
    return (
      <div className="w-full flex items-center justify-between px-3 py-1.5 bg-zinc-950/90 border border-zinc-800 rounded-lg shadow-lg backdrop-blur-sm text-white font-mono text-xs tracking-wider select-none">
        {/* Left: Level & Target Goal */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-emerald-950 border border-emerald-500/60 px-2 py-0.5 rounded text-emerald-400 font-bold uppercase text-[11px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/heart.png" alt="Heart" className="w-3 h-3 object-contain" />
            LEVEL {state.currentLevel}
          </div>
          <div className="flex items-center gap-1 text-amber-300 font-bold text-[11px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/target.png" alt="Target" className="w-3 h-3 object-contain" />
            GOAL: {config.targetScore} PTS
          </div>
        </div>

        {/* Right: Controller Mode & Sound Toggles */}
        <div className="flex items-center gap-2">
          {onToggleSoloMode && (
            <button
              onClick={onToggleSoloMode}
              className="flex items-center gap-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 px-2 py-0.5 rounded transition text-[11px] font-semibold active:scale-95"
              title="Toggle Controller Mode"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/games-2.png" alt="Controller" className="w-3.5 h-3.5 object-contain" />
              <span>{state.isSoloMouseMode ? 'Solo Mouse' : 'Motion Gyro'}</span>
            </button>
          )}

          {onToggleSound && (
            <button
              onClick={onToggleSound}
              className="flex items-center p-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 rounded transition active:scale-95"
              title="Toggle Sound"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={state.soundEnabled ? '/images/Sound_On.png' : '/images/Sound_On2.png'}
                alt="Sound"
                className="w-4 h-4 object-contain"
              />
            </button>
          )}
        </div>
      </div>
    );
  }

  // Bottom HUD Scoreboard: Single-line, compact, and embedded directly inside lower screen area
  return (
    <div className="w-full grid grid-cols-12 gap-1.5 sm:gap-2 select-none font-mono text-white">
      {/* 1. Shots Box (Left - Single Line) */}
      <div className="col-span-3 bg-zinc-950/85 border border-zinc-700/80 rounded-md py-1 px-2 flex items-center justify-center gap-1.5 shadow-md backdrop-blur-sm">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/bullet.png"
          alt="Bullet"
          className="w-3 h-4 object-contain"
        />
        <span className="text-[10px] sm:text-xs font-bold text-zinc-300 uppercase tracking-wider">
          SHOTS:
        </span>
        <span className="text-xs sm:text-sm font-black text-amber-400">
          {state.bulletsRemaining}
        </span>
      </div>

      {/* 2. Missed Shots & High Score Box (Center - Single Line) */}
      <div className="col-span-6 bg-zinc-950/85 border border-zinc-700/80 rounded-md py-1 px-2.5 flex items-center justify-around shadow-md backdrop-blur-sm">
        {/* Missed Shots */}
        <div className="flex items-center gap-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/nothit.png"
            alt="Missed"
            className="w-3 h-3 object-contain"
          />
          <span className="text-[10px] sm:text-xs font-bold text-zinc-300 uppercase tracking-wider">
            MISSED SHOTS:
          </span>
          <span className="text-xs sm:text-sm font-black text-rose-500">
            {state.missedShots}
          </span>
        </div>

        {/* Divider */}
        <div className="w-px h-3.5 bg-zinc-700" />

        {/* High Score */}
        <div className="flex items-center gap-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/trophy.png"
            alt="Trophy"
            className="w-3 h-3 object-contain"
          />
          <span className="text-[10px] sm:text-xs font-bold text-zinc-300 uppercase tracking-wider">
            HIGH SCORE:
          </span>
          <span className="text-xs sm:text-sm font-black text-amber-300">
            {state.highScore}
          </span>
        </div>
      </div>

      {/* 3. Current Score Box (Right - Single Line) */}
      <div className="col-span-3 bg-zinc-950/85 border border-zinc-700/80 rounded-md py-1 px-2 flex items-center justify-center gap-1.5 shadow-md backdrop-blur-sm">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/target.png"
          alt="Target"
          className="w-3 h-3 object-contain"
        />
        <span className="text-[10px] sm:text-xs font-bold text-zinc-300 uppercase tracking-wider">
          SCORE:
        </span>
        <span className="text-xs sm:text-sm font-black text-emerald-400">
          {state.score}
        </span>
      </div>
    </div>
  );
};
