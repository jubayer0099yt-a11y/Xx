import React, { useState } from 'react';
import { X, Copy, Check, Share2 } from 'lucide-react';
import { Language, TRANSLATIONS } from '../data/i18n';
import { playCopySound, playTapSound } from '../utils/sound';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  soundEnabled: boolean;
  onShowToast: (msg: string) => void;
  lang?: Language;
}

export function ShareModal({
  isOpen,
  onClose,
  soundEnabled,
  onShowToast,
  lang = 'en',
}: ShareModalProps) {
  const [copied, setCopied] = useState(false);
  const t = TRANSLATIONS[lang];
  const currentUrl = typeof window !== 'undefined' ? window.location.href : 'https://bio.link/jubayer';

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(currentUrl);
      setCopied(true);
      playCopySound(soundEnabled);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Ignore copy error
    }
  };

  const handleNativeShare = async () => {
    playTapSound(soundEnabled);
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'JUBAYER | Bio Links',
          text: "Check out official links and profiles for JUBAYER (@JUBAYER)",
          url: currentUrl,
        });
      } catch {
        // User cancelled
      }
    } else {
      handleCopy();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md transition-opacity duration-200"
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
              {t.shareModalTitle}
            </h3>
            <p className="text-xs text-neutral-400 mt-0.5">{t.shareModalDesc}</p>
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

        {/* Share Action Buttons */}
        <div className="space-y-3 mt-5">
          <button
            onClick={handleCopy}
            className="w-full h-12 px-4 rounded-xl bg-neutral-800/90 hover:bg-neutral-800 text-neutral-100 font-medium text-sm flex items-center justify-between border border-neutral-700/60 transition-all active:scale-[0.98]"
          >
            <span className="flex items-center gap-2.5">
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-neutral-400" />}
              <span>{copied ? t.copiedProfileLink : t.copyProfileLink}</span>
            </span>
            <span className="text-xs text-neutral-400 font-mono truncate max-w-[110px]">
              {currentUrl.replace(/^https?:\/\//, '')}
            </span>
          </button>

          <button
            onClick={handleNativeShare}
            className="w-full h-11 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-md shadow-indigo-600/20"
          >
            <Share2 className="w-4 h-4" />
            <span>{t.shareVia}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
