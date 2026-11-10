import React, { useState } from 'react';
import { Mail, Copy, Check, Send } from 'lucide-react';
import { ThemeConfig } from '../data/themes';
import { playCopySound, playTapSound } from '../utils/sound';

interface ContactCardProps {
  email: string;
  onShowToast: (msg: string) => void;
  soundEnabled: boolean;
  themeConfig: ThemeConfig;
}

export function ContactCard({ email, onShowToast, soundEnabled, themeConfig }: ContactCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      playCopySound(soundEnabled);
      onShowToast('Email copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      onShowToast('Could not copy email');
    }
  };

  const isLight = themeConfig.isLight;

  return (
    <div className={`w-full rounded-2xl border p-4 sm:p-5 mt-6 shadow-xl backdrop-blur-md transition-all ${
      isLight
        ? 'bg-white/90 border-slate-200 text-slate-900 shadow-slate-200/50'
        : `${themeConfig.cardBg} ${themeConfig.cardBorder} text-neutral-200`
    }`}>
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5">
          <div className={`w-8 h-8 rounded-xl border flex items-center justify-center ${
            isLight
              ? 'bg-amber-100 text-amber-600 border-amber-200'
              : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
          }`}>
            <Mail className="w-4 h-4" />
          </div>
          <div>
            <h4 className={`text-sm font-semibold font-display ${
              isLight ? 'text-slate-900' : 'text-white'
            }`}>
              Direct Inquiries & Collabs
            </h4>
            <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-neutral-400'}`}>
              Available for sponsorships, edits & projects
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mt-2">
        <div className={`flex-1 px-3.5 py-2.5 rounded-xl border text-xs font-mono truncate select-all flex items-center justify-between ${
          isLight
            ? 'bg-slate-50 border-slate-200 text-slate-800'
            : 'bg-neutral-950/70 border-neutral-800 text-neutral-300'
        }`}>
          <span className="truncate">{email}</span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleCopyEmail}
            className={`flex-1 sm:flex-none h-10 px-3.5 rounded-xl border text-xs font-medium flex items-center justify-center gap-1.5 transition-all active:scale-95 ${
              isLight
                ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-white border-neutral-700/60'
            }`}
            title="Copy email address"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>

          <a
            href={`mailto:${email}?subject=Collaboration%20Inquiry%20via%20Bio%20Links`}
            onClick={() => playTapSound(soundEnabled)}
            className={`flex-1 sm:flex-none h-10 px-4 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-md ${themeConfig.accentBg}`}
          >
            <Send className="w-3.5 h-3.5" />
            <span>Send Email</span>
          </a>
        </div>
      </div>
    </div>
  );
}
