import React from 'react';
import { ArrowUp, Share2, ShieldCheck } from 'lucide-react';
import { playTapSound } from '../utils/sound';

interface FooterProps {
  copyright: string;
  onOpenShareModal: () => void;
  soundEnabled: boolean;
}

export function Footer({ copyright, onOpenShareModal, soundEnabled }: FooterProps) {
  const scrollToTop = () => {
    playTapSound(soundEnabled);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="w-full max-w-2xl mx-auto px-4 pt-10 pb-12 mt-4 text-center">
      {/* Decorative subtle hairline divider */}
      <div className="w-24 h-px bg-neutral-800 mx-auto mb-6" />

      {/* Action shortcuts */}
      <div className="flex items-center justify-center gap-4 text-xs text-neutral-400 mb-4">
        <button
          onClick={scrollToTop}
          className="hover:text-neutral-200 transition-colors flex items-center gap-1 py-1 px-2"
        >
          <ArrowUp className="w-3.5 h-3.5" />
          <span>Back to Top</span>
        </button>

        <span className="text-neutral-700" aria-hidden="true">·</span>

        <button
          onClick={() => {
            playTapSound(soundEnabled);
            onOpenShareModal();
          }}
          className="hover:text-neutral-200 transition-colors flex items-center gap-1 py-1 px-2"
        >
          <Share2 className="w-3.5 h-3.5" />
          <span>Share Page</span>
        </button>

        <span className="text-neutral-700" aria-hidden="true">·</span>

        <span className="flex items-center gap-1 text-neutral-400 py-1">
          <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
          <span>Verified</span>
        </span>
      </div>

      {/* Official copyright statement */}
      <p className="text-xs text-neutral-500 font-medium tracking-wide">
        {copyright}
      </p>
    </footer>
  );
}
