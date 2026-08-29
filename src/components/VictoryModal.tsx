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
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch {
        // Ignored
      }
    }
  }, [isWon]);

  if (!isWon && !isGameOver) return null;

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 select-none font-mono">
      <div className="max-w-md w-full bg-zinc-950 border-4 border-zinc-700 rounded-2xl p-6 shadow-2xl text-center text-white animate-in fade-in zoom-in-95 duration-200">
        {/* Header Icon */}
        <div className="flex justify-center mb-4">
          {isWon ? (
            <div className="w-16 h-16 rounded-full bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center text-amber-300 shadow-lg shadow-amber-500/30 animate-bounce">
              <Trophy className="w-8 h-8" />
            </div>
          ) : (
            <div className="w-16 h-16 rounded-full bg-rose-500/20 border-2 border-rose-500 flex items-center justify-center text-rose-400 shadow-lg shadow-rose-500/30">
              <Skull className="w-8 h-8" />
            </div>
          )}
        </div>

        {/* Title */}
        <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-wider mb-1">
          {isWon ? (
            <span className="text-emerald-400">LEVEL COMPLETED!</span>
          ) : (
            <span className="text-rose-500">GAME OVER</span>
          )}
        </h2>

        {/* Subtitle Message */}
        <p className="text-zinc-300 text-xs sm:text-sm mb-6 leading-relaxed">
          {isWon
            ? 'Congratulations! You reached the score goal and proceed to the next level.'
            : `You missed the goal of ${config.targetScore} points with 10 bullets.`}
        </p>

        {/* Score Summary Card */}
        <div className="grid grid-cols-2 gap-3 bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-6">
          <div className="text-left border-r border-zinc-800 pr-2">
            <div className="text-[10px] text-zinc-500 uppercase font-bold">
              Final Score
            </div>
            <div className="text-2xl font-black text-amber-400">
              {state.score}
            </div>
          </div>
          <div className="text-left pl-2">
            <div className="text-[10px] text-zinc-500 uppercase font-bold">
              Missed Shots
            </div>
            <div className="text-2xl font-black text-rose-400">
              {state.missedShots}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2.5">
          {isWon && (
            <button
              onClick={onNextLevel}
              className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-95 text-black font-black text-sm tracking-wider rounded-xl uppercase flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/60 border border-emerald-400"
            >
              NEXT LEVEL <ArrowRight className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={onRestart}
            className={`w-full py-3 active:scale-95 text-white font-bold text-xs rounded-xl uppercase flex items-center justify-center gap-2 border ${
              isWon
                ? 'bg-zinc-900 hover:bg-zinc-800 border-zinc-700'
                : 'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-black text-sm border-rose-400 shadow-lg'
            }`}
          >
            <RotateCcw className="w-4 h-4" /> RESTART
          </button>

          <button
            onClick={onExitToLobby}
            className="w-full py-2.5 bg-transparent hover:bg-zinc-900 text-zinc-400 hover:text-zinc-200 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition"
          >
            <LogOut className="w-3.5 h-3.5" /> Back to Lobby
          </button>
        </div>
      </div>
    </div>
  );
};
