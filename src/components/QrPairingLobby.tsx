'use client';

import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Smartphone, MousePointer, QrCode, ShieldCheck, Sparkles } from 'lucide-react';

interface QrPairingLobbyProps {
  sessionId: string;
  onStartSoloMouse: () => void;
  controllerConnected: boolean;
}

export const QrPairingLobby: React.FC<QrPairingLobbyProps> = ({
  sessionId,
  onStartSoloMouse,
  controllerConnected,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  const joinUrl = typeof window !== 'undefined' && sessionId
    ? `${window.location.origin}/controller?session=${sessionId}`
    : '';

  useEffect(() => {
    if (typeof window !== 'undefined' && sessionId) {
      const origin = window.location.origin;
      const url = `${origin}/controller?session=${sessionId}`;

      QRCode.toDataURL(url, {
        width: 260,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      })
        .then((dataUrl) => {
          setQrDataUrl(dataUrl);
        })
        .catch((err) => console.error('QR generation error:', err));
    }
  }, [sessionId]);

  return (
    <div className="relative z-20 max-w-2xl w-full mx-auto bg-zinc-950/90 border-4 border-emerald-500/80 rounded-2xl p-8 shadow-2xl backdrop-blur-md text-white font-mono text-center">
      {/* Title & Badge */}
      <div className="flex items-center justify-center gap-2 mb-2">
        <span className="bg-emerald-500 text-black font-extrabold text-xs px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5" /> Web Arcade Light Gun
        </span>
      </div>

      <h1 className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-yellow-300 to-amber-400 tracking-wider mb-2 drop-shadow">
        GOOSE HUNTER
      </h1>

      <p className="text-zinc-400 text-sm mb-6 max-w-md mx-auto">
        Transform your smartphone into a motion-controlled light gun. Scan the QR code below to pair instantly!
      </p>

      {/* Main Pairing Box */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center bg-zinc-900/90 border-2 border-zinc-700/80 rounded-xl p-6 mb-6">
        {/* QR Code Container */}
        <div className="flex flex-col items-center justify-center p-3 bg-white rounded-lg shadow-md">
          {qrDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={qrDataUrl}
              alt={`Pairing QR code for session ${sessionId}`}
              className="w-48 h-48 object-contain rounded"
            />
          ) : (
            <div className="w-48 h-48 flex items-center justify-center text-zinc-500">
              <QrCode className="w-12 h-12 animate-pulse" />
            </div>
          )}
          <span className="text-[10px] text-zinc-600 font-bold mt-1 uppercase">
            Scan with phone camera
          </span>
        </div>

        {/* Step-by-Step Pairing Instructions */}
        <div className="text-left flex flex-col gap-3.5 text-xs text-zinc-300">
          <div className="flex items-start gap-2.5">
            <span className="bg-emerald-600 text-black font-bold w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-xs">
              1
            </span>
            <div>
              <div className="font-bold text-white">Scan QR Code</div>
              <div className="text-zinc-400 text-[11px]">
                Open camera on your smartphone and tap the link.
              </div>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <span className="bg-emerald-600 text-black font-bold w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-xs">
              2
            </span>
            <div>
              <div className="font-bold text-white">Allow Motion Sensors</div>
              <div className="text-zinc-400 text-[11px]">
                Grant gyroscope orientation permission when prompted.
              </div>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <span className="bg-emerald-600 text-black font-bold w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-xs">
              3
            </span>
            <div>
              <div className="font-bold text-white">Point & Calibrate</div>
              <div className="text-zinc-400 text-[11px]">
                Aim phone at the screen center and tap Calibrate!
              </div>
            </div>
          </div>

          {/* Session Code Highlight */}
          <div className="mt-1 p-2.5 bg-black/60 border border-zinc-700 rounded text-center">
            <div className="text-[10px] text-zinc-500 uppercase font-semibold">
              Room Session Code
            </div>
            <div className="text-2xl font-black text-amber-400 tracking-widest">
              {sessionId || '---'}
            </div>
          </div>
        </div>
      </div>

      {/* Controller Connection Status */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 border-t border-zinc-800">
        <div className="flex items-center gap-2 text-xs">
          {controllerConnected ? (
            <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
              <ShieldCheck className="w-4 h-4" /> Controller Connected! Point & Calibrate on phone.
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-amber-400 animate-pulse">
              <Smartphone className="w-4 h-4" /> Waiting for smartphone connection...
            </span>
          )}
        </div>

        {/* Solo Mouse Fallback Button */}
        <button
          onClick={onStartSoloMouse}
          className="flex items-center gap-2 bg-gradient-to-r from-sky-600 to-blue-700 hover:from-sky-500 hover:to-blue-600 text-white font-bold text-xs px-4 py-2.5 rounded-lg border border-sky-400/40 shadow transition active:scale-95"
        >
          <MousePointer className="w-4 h-4" /> Play Solo with Mouse
        </button>
      </div>

      {joinUrl && (
        <div className="mt-4 text-[10px] text-zinc-500 truncate">
          Direct link:{' '}
          <a
            href={joinUrl}
            target="_blank"
            rel="noreferrer"
            className="text-sky-400 hover:underline"
          >
            {joinUrl}
          </a>
        </div>
      )}
    </div>
  );
};
