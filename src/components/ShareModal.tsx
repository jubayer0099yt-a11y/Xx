import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { X, Copy, Check, Share2, Download, ExternalLink } from 'lucide-react';
import { playCopySound, playTapSound } from '../utils/sound';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  soundEnabled: boolean;
  onShowToast: (msg: string) => void;
}

export function ShareModal({ isOpen, onClose, soundEnabled, onShowToast }: ShareModalProps) {
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const currentUrl = typeof window !== 'undefined' ? window.location.href : 'https://bio.link/jubayer';

  useEffect(() => {
    if (isOpen && canvasRef.current) {
      QRCode.toCanvas(
        canvasRef.current,
        currentUrl,
        {
          width: 220,
          margin: 2,
          color: {
            dark: '#0f172a',
            light: '#ffffff',
          },
        },
        (err) => {
          if (err) console.error(err);
        }
      );
    }
  }, [isOpen, currentUrl]);

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(currentUrl);
      setCopied(true);
      playCopySound(soundEnabled);
      onShowToast('Profile link copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      onShowToast('Failed to copy link');
    }
  };

  const handleNativeShare = async () => {
    playTapSound(soundEnabled);
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'JUBAYER | Bio Links',
          text: 'Check out official links and profiles for JUBAYER (@JUBAYER)',
          url: currentUrl,
        });
      } catch {
        // User cancelled share
      }
    } else {
      handleCopy();
    }
  };

  const handleDownloadQR = () => {
    playTapSound(soundEnabled);
    if (!canvasRef.current) return;
    const link = document.createElement('a');
    link.download = 'jubayer-bio-links-qr.png';
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();
    onShowToast('QR Code image downloaded!');
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md transition-opacity duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-2xl relative text-neutral-100 animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
          <div>
            <h3 id="share-modal-title" className="text-lg font-bold font-display text-white">
              Share Profile
            </h3>
            <p className="text-xs text-neutral-400 mt-0.5">Scan or share JUBAYER's official links</p>
          </div>
          <button
            onClick={() => {
              playTapSound(soundEnabled);
              onClose();
            }}
            className="w-9 h-9 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white flex items-center justify-center transition-colors"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* QR Code Container */}
        <div className="my-5 flex flex-col items-center">
          <div className="p-3 bg-white rounded-2xl shadow-lg border border-neutral-200 flex items-center justify-center">
            <canvas ref={canvasRef} className="rounded-lg" />
          </div>
          <p className="text-xs text-neutral-400 mt-3 font-medium">Point phone camera to scan</p>
        </div>

        {/* Share Action Buttons */}
        <div className="space-y-2.5">
          <button
            onClick={handleCopy}
            className="w-full h-11 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-100 font-medium text-sm flex items-center justify-between border border-neutral-700/60 transition-all active:scale-[0.98]"
          >
            <span className="flex items-center gap-2.5">
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-neutral-400" />}
              <span>{copied ? 'Copied to Clipboard!' : 'Copy Profile Link'}</span>
            </span>
            <span className="text-xs text-neutral-400 font-mono truncate max-w-[110px]">
              {currentUrl.replace(/^https?:\/\//, '')}
            </span>
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleNativeShare}
              className="h-11 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-md shadow-indigo-600/20"
            >
              <Share2 className="w-4 h-4" />
              <span>Share via...</span>
            </button>

            <button
              onClick={handleDownloadQR}
              className="h-11 px-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-medium text-xs flex items-center justify-center gap-2 border border-neutral-700/60 transition-all active:scale-[0.98]"
            >
              <Download className="w-4 h-4" />
              <span>Save QR Code</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
