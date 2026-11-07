import React, { useState } from 'react';
import { Mail, Copy, Check, Send, MessageCircle } from 'lucide-react';
import { playCopySound, playTapSound } from '../utils/sound';

interface ContactCardProps {
  email: string;
  onShowToast: (msg: string) => void;
  soundEnabled: boolean;
}

export function ContactCard({ email, onShowToast, soundEnabled }: ContactCardProps) {
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

  return (
    <div className="w-full rounded-2xl bg-gradient-to-b from-neutral-900/90 to-neutral-900/50 border border-neutral-800/80 p-4 sm:p-5 text-neutral-200 mt-6 shadow-xl">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center">
            <Mail className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-semibold font-display text-white">Direct Inquiries & Collabs</h4>
            <p className="text-xs text-neutral-400">Available for sponsorships, edits & projects</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mt-2">
        <div className="flex-1 px-3.5 py-2.5 rounded-xl bg-neutral-950/70 border border-neutral-800 text-xs font-mono text-neutral-300 truncate select-all flex items-center justify-between">
          <span className="truncate">{email}</span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleCopyEmail}
            className="flex-1 sm:flex-none h-10 px-3.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-white border border-neutral-700/60 text-xs font-medium flex items-center justify-center gap-1.5 transition-all active:scale-95"
            title="Copy email address"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>

          <a
            href={`mailto:${email}?subject=Collaboration%20Inquiry%20via%20Bio%20Links`}
            onClick={() => playTapSound(soundEnabled)}
            className="flex-1 sm:flex-none h-10 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-md shadow-indigo-600/20"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Send Email</span>
          </a>
        </div>
      </div>
    </div>
  );
}
