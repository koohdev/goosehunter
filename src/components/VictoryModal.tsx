'use client';

import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Trophy, RotateCcw, ArrowRight, Skull, LogOut } from 'lucide-react';
import { GameRoundState, LevelConfig } from '@/lib/types';

interface VictoryModalProps {
  state: GameRoundState;
  config: LevelConfig;
  onNextLevel: () => void;
  onRestart: () => void;
  onExitToLobby: () => void;
}

export const VictoryModal: React.FC<VictoryModalProps> = ({
  state,
  config,
  onNextLevel,
  onRestart,
  onExitToLobby,
}) => {
  const isWon = state.status === 'ROUND_WON';
  const isGameOver = state.status === 'GAME_OVER';

  useEffect(() => {
    if (isWon) {
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.6 },
          colors: ['#d97706', '#15803d', '#3b82f6', '#f59e0b'],
        });
      } catch {
        // Ignored
      }
    }
  }, [isWon]);

  if (!isWon && !isGameOver) return null;

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 select-none font-mono">
      <div className="max-w-md w-full bg-zinc-950 border-2 border-zinc-700 rounded-xl p-6 shadow-2xl text-center text-zinc-200 animate-in fade-in zoom-in-95 duration-200">
        {/* Header Icon */}
        <div className="flex justify-center mb-3">
          {isWon ? (
            <div className="w-14 h-14 rounded-full bg-zinc-900 border border-amber-500/60 flex items-center justify-center text-amber-400 shadow">
              <Trophy className="w-7 h-7" />
            </div>
          ) : (
            <div className="w-14 h-14 rounded-full bg-zinc-900 border border-rose-500/60 flex items-center justify-center text-rose-400 shadow">
              <Skull className="w-7 h-7" />
            </div>
          )}
        </div>

        {/* Title */}
        <h2 className="text-xl sm:text-2xl font-bold uppercase tracking-wider mb-1 text-zinc-100">
          {isWon ? 'LEVEL COMPLETED' : 'GAME OVER'}
        </h2>

        {/* Subtitle Message */}
        <p className="text-zinc-400 text-xs mb-5 leading-relaxed">
          {isWon
            ? 'Score goal reached. Proceed to the next level.'
            : `Goal of ${config.targetScore} points not reached with 10 bullets.`}
        </p>

        {/* Score Summary Card */}
        <div className="grid grid-cols-2 gap-3 bg-zinc-900/90 border border-zinc-800 rounded-lg p-3.5 mb-5">
          <div className="text-left border-r border-zinc-800 pr-2">
            <div className="text-[10px] text-zinc-500 uppercase font-semibold">
              FINAL SCORE
            </div>
            <div className="text-xl font-bold text-amber-400">
              {state.score}
            </div>
          </div>
          <div className="text-left pl-2">
            <div className="text-[10px] text-zinc-500 uppercase font-semibold">
              MISSED SHOTS
            </div>
            <div className="text-xl font-bold text-rose-400">
              {state.missedShots}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2">
          {isWon && (
            <button
              onClick={onNextLevel}
              className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-zinc-100 font-bold text-xs tracking-wider rounded-lg uppercase flex items-center justify-center gap-2 border border-zinc-600 transition"
            >
              <span>NEXT LEVEL</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={onRestart}
            className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-800 active:scale-95 text-zinc-200 font-bold text-xs tracking-wider rounded-lg uppercase flex items-center justify-center gap-2 border border-zinc-700 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>RESTART</span>
          </button>

          <button
            onClick={onExitToLobby}
            className="w-full py-2 bg-transparent hover:bg-zinc-900 text-zinc-500 hover:text-zinc-300 text-xs font-semibold rounded flex items-center justify-center gap-1.5 transition"
          >
            <LogOut className="w-3 h-3" />
            <span>Back to Lobby</span>
          </button>
        </div>
      </div>
    </div>
  );
};
