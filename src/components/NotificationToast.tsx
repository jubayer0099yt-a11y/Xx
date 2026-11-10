import React, { useEffect, useState } from 'react';
import { CheckCircle2, Sparkles, X } from 'lucide-react';
import { ThemeConfig } from '../data/themes';

interface NotificationToastProps {
  message: string | null;
  onDismiss: () => void;
  themeConfig?: ThemeConfig;
}

export function NotificationToast({ message, onDismiss, themeConfig }: NotificationToastProps) {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (!message) {
      setProgress(100);
      return;
    }

    setProgress(100);
    const duration = 2800; // ms
    const interval = 28;
    const decrement = (interval / duration) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev <= decrement) {
          clearInterval(timer);
          return 0;
        }
        return prev - decrement;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [message]);

  if (!message) return null;

  const isLight = themeConfig?.isLight;

  return (
    <aside
      aria-label="Notification"
      className="fixed top-5 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm px-4 pointer-events-auto transition-all duration-300 animate-in fade-in slide-in-from-top-4"
    >
      <div
        className={`w-full rounded-2xl border p-3 shadow-2xl backdrop-blur-2xl relative overflow-hidden transition-all ${
          isLight
            ? 'bg-white/95 border-slate-200 text-slate-900 shadow-slate-300/60'
            : 'bg-neutral-900/95 border-neutral-700/80 text-white shadow-black/80 ring-1 ring-white/10'
        }`}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold truncate leading-tight">
                {message}
              </p>
            </div>
          </div>

          <button
            onClick={onDismiss}
            className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
              isLight ? 'hover:bg-slate-100 text-slate-500' : 'hover:bg-neutral-800 text-neutral-400 hover:text-white'
            }`}
            aria-label="Close notification"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Animated Progress Timer Bar */}
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-neutral-800/40">
          <div
            className="h-full bg-emerald-400 transition-all duration-75 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </aside>
  );
}
