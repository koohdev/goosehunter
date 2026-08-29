'use client';

import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Smartphone, MousePointer, QrCode, ShieldCheck, Copy, Check, Radio } from 'lucide-react';

interface QrPairingLobbyProps {
  sessionId: string;
  onStartSoloMouse: () => void;
  controllerConnected: boolean;
}

const emptySubscribe = () => () => {};

export const QrPairingLobby: React.FC<QrPairingLobbyProps> = ({
  sessionId,
  onStartSoloMouse,
  controllerConnected,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  const isClient = React.useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  const joinUrl =
    isClient && sessionId
      ? `${window.location.origin}/controller?session=${sessionId}`
      : '';

  useEffect(() => {
    if (typeof window !== 'undefined' && sessionId) {
      const origin = window.location.origin;
      const url = `${origin}/controller?session=${sessionId}`;

      QRCode.toDataURL(url, {
        width: 280,
        margin: 2,
        errorCorrectionLevel: 'M',
        color: {
          dark: '#09090b',
          light: '#ffffff',
        },
      })
        .then((dataUrl) => {
          setQrDataUrl(dataUrl);
        })
        .catch((err) => console.error('QR generation error:', err));
    }
  }, [sessionId]);

  const handleCopyLink = () => {
    if (!joinUrl) return;
    navigator.clipboard.writeText(joinUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="relative z-20 max-w-2xl w-full mx-auto bg-zinc-950/95 border-2 border-zinc-700 rounded-xl p-6 sm:p-8 shadow-2xl backdrop-blur-md text-zinc-200 font-mono text-center">
      {/* Title & Badge */}
      <div className="flex items-center justify-center gap-2 mb-2">
        <span className="inline-flex items-center gap-1.5 bg-zinc-800 text-zinc-300 border border-zinc-700 font-semibold text-xs px-3 py-1 rounded-full uppercase tracking-wider">
          <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
          WebRTC Light Gun Link
        </span>
      </div>

      <h1 className="text-3xl sm:text-4xl font-bold text-zinc-100 tracking-wider mb-2">
        GOOSE HUNTER
      </h1>

      <p className="text-zinc-400 text-xs sm:text-sm mb-6 max-w-md mx-auto">
        Pair your smartphone as a motion-controlled light gun by scanning the QR code below.
      </p>

      {/* Main Pairing Box */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center bg-zinc-900/90 border border-zinc-800 rounded-lg p-6 mb-6">
        {/* QR Code Container */}
        <div className="flex flex-col items-center justify-center p-3 bg-white rounded-lg shadow-md">
          {qrDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={qrDataUrl}
              alt={`Pairing QR code for session ${sessionId}`}
              className="w-48 h-48 sm:w-52 sm:h-52 object-contain rounded"
            />
          ) : (
            <div className="w-48 h-48 sm:w-52 sm:h-52 flex flex-col items-center justify-center text-zinc-500 gap-2">
              <QrCode className="w-12 h-12 animate-pulse text-zinc-400" />
              <span className="text-[11px] text-zinc-600 font-medium">Generating Room QR...</span>
            </div>
          )}
          <span className="text-[10px] text-zinc-800 font-bold mt-1.5 uppercase tracking-wide">
            Scan with phone camera
          </span>
        </div>

        {/* Step-by-Step Pairing Instructions */}
        <div className="text-left flex flex-col gap-3.5 text-xs text-zinc-300">
          <div className="flex items-start gap-2.5">
            <span className="bg-zinc-800 border border-zinc-700 text-zinc-200 font-bold w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-xs">
              1
            </span>
            <div>
              <div className="font-semibold text-zinc-100">Scan QR Code</div>
              <div className="text-zinc-400 text-[11px]">
                Open camera on your phone and tap the link.
              </div>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <span className="bg-zinc-800 border border-zinc-700 text-zinc-200 font-bold w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-xs">
              2
            </span>
            <div>
              <div className="font-semibold text-zinc-100">Allow Motion Sensors</div>
              <div className="text-zinc-400 text-[11px]">
                Grant gyroscope orientation permission when prompted.
              </div>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <span className="bg-zinc-800 border border-zinc-700 text-zinc-200 font-bold w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-xs">
              3
            </span>
            <div>
              <div className="font-semibold text-zinc-100">Point & Calibrate</div>
              <div className="text-zinc-400 text-[11px]">
                Aim phone at the screen center and tap Calibrate.
              </div>
            </div>
          </div>

          {/* Session Code Highlight */}
          <div className="mt-1 p-2.5 bg-black/70 border border-zinc-800 rounded text-center">
            <div className="text-[10px] text-zinc-500 uppercase font-semibold">
              Room Session Code
            </div>
            <div className="text-2xl font-bold text-amber-400 tracking-widest">
              {sessionId || '----'}
            </div>
          </div>
        </div>
      </div>

      {/* Controller Connection Status */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 border-t border-zinc-800">
        <div className="flex items-center gap-2 text-xs">
          {controllerConnected ? (
            <span className="flex items-center gap-1.5 text-zinc-200 font-semibold">
              <ShieldCheck className="w-4 h-4 text-emerald-400" /> Controller Connected! Calibrating on phone...
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-zinc-400">
              <Smartphone className="w-4 h-4 text-amber-400 animate-bounce" /> Waiting for smartphone connection...
            </span>
          )}
        </div>

        {/* Solo Mouse Fallback Button */}
        <button
          onClick={onStartSoloMouse}
          className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-xs px-4 py-2.5 rounded-lg border border-zinc-600 shadow transition active:scale-95 cursor-pointer"
        >
          <MousePointer className="w-4 h-4" /> Play Solo with Mouse
        </button>
      </div>

      {joinUrl && (
        <div className="mt-4 flex items-center justify-center gap-2 text-[11px] text-zinc-400 bg-zinc-900/60 p-2 rounded border border-zinc-800/80">
          <span className="truncate max-w-xs sm:max-w-md">{joinUrl}</span>
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-1 text-zinc-300 hover:text-zinc-100 bg-zinc-800 hover:bg-zinc-700 px-2 py-1 rounded text-[10px] uppercase font-bold shrink-0 transition"
            title="Copy controller URL"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-emerald-400" />
                <span className="text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span>Copy Link</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};
