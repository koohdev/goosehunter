'use client';

import React, { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { MobileController } from '@/components/MobileController';
import { Smartphone, ArrowRight } from 'lucide-react';

function ControllerContent() {
  const searchParams = useSearchParams();
  const sessionFromUrl = searchParams.get('session') || '';
  const [inputSession, setInputSession] = useState(sessionFromUrl);
  const [activeSession, setActiveSession] = useState(sessionFromUrl);

  const handleManualJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputSession.trim()) {
      setActiveSession(inputSession.toUpperCase().trim());
    }
  };

  if (!activeSession) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white font-mono flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-emerald-950/80 border-2 border-emerald-500 flex items-center justify-center text-emerald-400 mb-4 shadow-lg shadow-emerald-900/50">
          <Smartphone className="w-8 h-8" />
        </div>

        <h1 className="text-2xl font-black text-amber-400 mb-2">JOIN GAME ROOM</h1>
        <p className="text-zinc-400 text-xs max-w-xs mb-6">
          Enter the 4-character Room Code displayed on your desktop screen:
        </p>

        <form onSubmit={handleManualJoin} className="w-full max-w-xs flex flex-col gap-4">
          <input
            type="text"
            maxLength={4}
            value={inputSession}
            onChange={(e) => setInputSession(e.target.value.toUpperCase())}
            placeholder="ABCD"
            className="w-full text-center text-3xl font-black tracking-widest uppercase bg-zinc-900 border-2 border-zinc-700 focus:border-emerald-500 rounded-xl py-3 text-white outline-none shadow-inner"
          />

          <button
            type="submit"
            className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 active:scale-95 text-black font-black text-sm rounded-xl uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg"
          >
            Connect Controller <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    );
  }

  return <MobileController sessionId={activeSession} />;
}

export default function ControllerPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center font-mono">Loading Controller...</div>}>
      <ControllerContent />
    </Suspense>
  );
}
