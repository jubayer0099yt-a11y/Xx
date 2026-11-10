import React from 'react';
import { ArrowUp, Share2, ShieldCheck } from 'lucide-react';
import { ThemeConfig } from '../data/themes';
import { Language, TRANSLATIONS } from '../data/i18n';
import { playTapSound } from '../utils/sound';

interface FooterProps {
  copyright: string;
  onOpenShareModal: () => void;
  soundEnabled: boolean;
  themeConfig?: ThemeConfig;
  lang?: Language;
}

export function Footer({
  copyright,
  onOpenShareModal,
  soundEnabled,
  themeConfig,
  lang = 'en',
}: FooterProps) {
  const t = TRANSLATIONS[lang];
  const scrollToTop = () => {
    playTapSound(soundEnabled);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const isLight = themeConfig?.isLight;

  return (
    <footer className="w-full max-w-2xl mx-auto px-4 pt-10 pb-12 mt-4 text-center">
      {/* Decorative subtle hairline divider */}
      <div className={`w-24 h-px mx-auto mb-6 ${isLight ? 'bg-slate-300' : 'bg-neutral-800'}`} />

      {/* Action shortcuts */}
      <div
        className={`flex items-center justify-center gap-4 text-xs mb-4 ${
          isLight ? 'text-slate-600' : 'text-neutral-400'
        }`}
      >
        <button
          onClick={scrollToTop}
          className={`transition-colors flex items-center gap-1 py-1 px-2 ${
            isLight ? 'hover:text-slate-900' : 'hover:text-neutral-200'
          }`}
        >
          <ArrowUp className="w-3.5 h-3.5" />
          <span>{t.backToTop}</span>
        </button>

        <span className={isLight ? 'text-slate-300' : 'text-neutral-700'} aria-hidden="true">
          ·
        </span>

        <button
          onClick={() => {
            playTapSound(soundEnabled);
            onOpenShareModal();
          }}
          className={`transition-colors flex items-center gap-1 py-1 px-2 ${
            isLight ? 'hover:text-slate-900' : 'hover:text-neutral-200'
          }`}
        >
          <Share2 className="w-3.5 h-3.5" />
          <span>{t.sharePage}</span>
        </button>

        <span className={isLight ? 'text-slate-300' : 'text-neutral-700'} aria-hidden="true">
          ·
        </span>

        <span className="flex items-center gap-1 py-1">
          <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
          <span>{t.tagVerified}</span>
        </span>
      </div>

      {/* Official copyright statement */}
      <p className={`text-xs font-medium tracking-wide ${isLight ? 'text-slate-500' : 'text-neutral-500'}`}>
        {lang === 'bn' ? '© ২০২৬ JUBAYER · সর্বস্বত্ব সংরক্ষিত' : copyright}
      </p>
    </footer>
  );
}
