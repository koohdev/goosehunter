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
      <div className="min-h-screen bg-zinc-950 text-zinc-200 font-mono flex flex-col items-center justify-center p-6 text-center">
        <div className="w-14 h-14 rounded-full bg-zinc-900 border border-zinc-700 flex items-center justify-center text-zinc-300 mb-4 shadow">
          <Smartphone className="w-7 h-7 text-amber-400" />
        </div>

        <h1 className="text-xl sm:text-2xl font-bold text-zinc-100 mb-2">JOIN GAME ROOM</h1>
        <p className="text-zinc-400 text-xs max-w-xs mb-6">
          Enter the 4-character Room Code displayed on your screen:
        </p>

        <form onSubmit={handleManualJoin} className="w-full max-w-xs flex flex-col gap-3.5">
          <input
            type="text"
            maxLength={4}
            value={inputSession}
            onChange={(e) => setInputSession(e.target.value.toUpperCase())}
            placeholder="ABCD"
            className="w-full text-center text-2xl sm:text-3xl font-bold tracking-widest uppercase bg-zinc-900 border border-zinc-700 focus:border-zinc-500 rounded-lg py-3 text-zinc-100 outline-none"
          />

          <button
            type="submit"
            className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-zinc-100 font-bold text-xs rounded-lg uppercase tracking-wider flex items-center justify-center gap-2 border border-zinc-600 transition"
          >
            <span>Connect Controller</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    );
  }

  return <MobileController sessionId={activeSession} />;
}

export default function ControllerPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-zinc-950 text-zinc-400 flex items-center justify-center font-mono text-xs">
          Loading Controller...
        </div>
      }
    >
      <ControllerContent />
    </Suspense>
  );
}
