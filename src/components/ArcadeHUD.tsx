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
      <div className="w-full flex items-center justify-between px-3 py-1.5 bg-zinc-950/90 border border-zinc-800 rounded-lg shadow-lg backdrop-blur-md text-zinc-300 font-mono text-xs tracking-wider select-none">
        {/* Left: Level & Target Goal */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          <div className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-700 px-2.5 h-8 rounded text-zinc-200 font-semibold text-xs shadow-inner">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/heart.png" alt="Level" className="w-3.5 h-3.5 object-contain opacity-90" />
            <span>LEVEL {state.currentLevel}</span>
          </div>

          <div className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-700 px-2.5 h-8 rounded text-zinc-300 font-semibold text-xs shadow-inner">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/target.png" alt="Goal" className="w-3.5 h-3.5 object-contain opacity-90" />
            <span>GOAL: {config.targetScore} PTS</span>
          </div>
        </div>

        {/* Right: Controller Mode & Sound Toggles */}
        <div className="flex items-center gap-2">
          {onToggleSoloMode && (
            <button
              onClick={onToggleSoloMode}
              className="h-8 px-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 rounded transition text-xs font-semibold flex items-center gap-1.5 active:scale-95 shadow cursor-pointer"
              title="Toggle Controller Mode"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/games-2.png" alt="Controller" className="w-3.5 h-3.5 object-contain opacity-90" />
              <span>{state.isSoloMouseMode ? 'Solo Mouse' : 'Motion Gyro'}</span>
            </button>
          )}

          {onToggleSound && (
            <button
              onClick={onToggleSound}
              className="h-8 w-8 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 rounded flex items-center justify-center transition active:scale-95 shadow cursor-pointer"
              title="Toggle Sound"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={state.soundEnabled ? '/images/Sound_On.png' : '/images/Sound_On2.png'}
                alt="Sound"
                className="w-4 h-4 object-contain opacity-90"
              />
            </button>
          )}
        </div>
      </div>
    );
  }

  // Bottom HUD Scoreboard: Flanking bottom-left and bottom-right so the first-person shotgun in center is unobstructed
  return (
    <div className="w-full flex items-center justify-between pointer-events-none select-none font-mono text-zinc-300">
      {/* 1. Left Cluster: Ammo & Missed Shots */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Bullets Remaining */}
        <div className="bg-zinc-950/90 border border-zinc-800/90 rounded-md py-1.5 px-3 flex items-center gap-2 shadow-lg backdrop-blur-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/bullet.png"
            alt="Bullet"
            className="w-3.5 h-4 object-contain opacity-90"
          />
          <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
            AMMO
          </span>
          <span className={`text-sm sm:text-base font-black ${state.bulletsRemaining <= 3 ? 'text-rose-500 animate-pulse' : 'text-amber-400'}`}>
            {state.bulletsRemaining}
          </span>
        </div>

        {/* Missed Shots */}
        <div className="hidden sm:flex items-center gap-1.5 bg-zinc-950/80 border border-zinc-800/80 rounded-md py-1.5 px-2.5 shadow-lg backdrop-blur-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/nothit.png"
            alt="Missed"
            className="w-3 h-3 object-contain opacity-80"
          />
          <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider">
            MISS:
          </span>
          <span className="text-xs font-bold text-rose-400">
            {state.missedShots}
          </span>
        </div>
      </div>

      {/* 2. Right Cluster: Score & High Score */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* High Score */}
        <div className="hidden sm:flex items-center gap-1.5 bg-zinc-950/80 border border-zinc-800/80 rounded-md py-1.5 px-2.5 shadow-lg backdrop-blur-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/trophy.png"
            alt="High Score"
            className="w-3 h-3 object-contain opacity-80"
          />
          <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider">
            BEST:
          </span>
          <span className="text-xs font-bold text-amber-300">
            {state.highScore}
          </span>
        </div>

        {/* Current Score */}
        <div className="bg-zinc-950/90 border border-zinc-800/90 rounded-md py-1.5 px-3 flex items-center gap-2 shadow-lg backdrop-blur-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/target.png"
            alt="Score"
            className="w-3.5 h-3.5 object-contain opacity-90"
          />
          <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
            SCORE
          </span>
          <span className="text-sm sm:text-base font-black text-emerald-400">
            {state.score}
          </span>
        </div>
      </div>
    </div>
  );
};
