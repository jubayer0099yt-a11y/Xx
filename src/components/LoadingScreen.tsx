import React, { useEffect, useState } from 'react';

interface LoadingScreenProps {
  avatarUrl: string;
}

const INTRO_STORAGE_KEY = 'jubayer_intro_shown';

export function LoadingScreen({ avatarUrl }: LoadingScreenProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let hasShownBefore = false;
    try {
      hasShownBefore = sessionStorage.getItem(INTRO_STORAGE_KEY) === '1';
      if (!hasShownBefore) {
        sessionStorage.setItem(INTRO_STORAGE_KEY, '1');
      }
    } catch {
      // Ignore storage access errors
    }

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const holdMs = prefersReducedMotion ? 150 : hasShownBefore ? 380 : 1250;
    const fadeMs = prefersReducedMotion ? 200 : 450;

    // Trigger smooth CSS progress fill on next frame
    const rafId = requestAnimationFrame(() => {
      setProgress(100);
    });

    const fadeTimer = window.setTimeout(() => {
      setIsFadingOut(true);
    }, holdMs);

    const removeTimer = window.setTimeout(() => {
      setIsVisible(false);
    }, holdMs + fadeMs);

    return () => {
      cancelAnimationFrame(rafId);
      window.clearTimeout(fadeTimer);
      window.clearTimeout(removeTimer);
    };
  }, []);

  if (!isVisible) return null;

  return (
    <div
      role="status"
      aria-label="Loading JUBAYER"
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#060d1f] transition-opacity duration-500 ease-out ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Subtle Navy & Golden Radial Ambient Glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(circle at 50% 45%, rgba(245, 158, 11, 0.14) 0%, rgba(15, 29, 66, 0.5) 40%, rgba(6, 13, 31, 1) 78%)',
        }}
      />

      <div className="relative z-10 flex flex-col items-center px-6">
        {/* Profile Logo with Golden Orbital Rings */}
        <div className="relative w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center">
          {/* Outer slow-spinning golden arc */}
          <div className="absolute inset-0 rounded-full border-2 border-amber-400/20 border-t-amber-400 border-r-amber-300/70 animate-spin [animation-duration:2.2s]" />

          {/* Inner counter-glow ring */}
          <div className="absolute inset-2 rounded-full border border-amber-200/20 shadow-[0_0_28px_rgba(251,191,36,0.22)]" />

          {/* Profile Avatar */}
          <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-full overflow-hidden bg-[#0b1838] ring-2 ring-amber-400/50 shadow-xl flex items-center justify-center">
            <img
              src={avatarUrl}
              alt="JUBAYER"
              className="w-full h-full object-cover object-top"
            />
          </div>
        </div>

        {/* JUBAYER Brand Wordmark */}
        <div className="mt-6 flex flex-col items-center">
          <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-[0.28em] text-white pl-[0.28em]">
            JUBAYER
          </h2>
          <div className="mt-2 flex items-center gap-2">
            <span className="h-[1px] w-6 bg-gradient-to-r from-transparent to-amber-400/80" />
            <span className="text-[11px] uppercase tracking-[0.25em] text-amber-300/90 font-medium">
              Official Hub
            </span>
            <span className="h-[1px] w-6 bg-gradient-to-l from-transparent to-amber-400/80" />
          </div>
        </div>

        {/* Sleek Golden Loading Bar */}
        <div className="mt-6 w-44 sm:w-52 h-[3px] rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-500 via-amber-300 to-amber-500 transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(251,191,36,0.7)]"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
