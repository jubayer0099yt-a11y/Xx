import React, { useEffect, useState } from 'react';
import { Eye, Users, TrendingUp } from 'lucide-react';
import { ThemeConfig } from '../data/themes';
import { Language, TRANSLATIONS } from '../data/i18n';

interface VisitorCounterProps {
  themeConfig: ThemeConfig;
  lang: Language;
}

export function VisitorCounter({ themeConfig, lang }: VisitorCounterProps) {
  const [targetCount, setTargetCount] = useState<number>(3482);
  const [displayCount, setDisplayCount] = useState<number>(0);
  const [activeOnline, setActiveOnline] = useState<number>(4);

  const t = TRANSLATIONS[lang];
  const isLight = themeConfig.isLight;

  // Convert number to Bengali numerals if language is Bangla
  const formatNumber = (num: number): string => {
    const formatted = num.toLocaleString();
    if (lang !== 'bn') return formatted;
    const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    return formatted.replace(/[0-9]/g, (d) => bnDigits[Number(d)]);
  };

  // Fetch / Increment real visitor count
  useEffect(() => {
    let isMounted = true;

    async function recordVisit() {
      try {
        const hasVisitedThisSession = sessionStorage.getItem('jubayer_session_visit');
        const endpoint = hasVisitedThisSession ? '/api/visitors' : '/api/visitors/hit';
        const method = hasVisitedThisSession ? 'GET' : 'POST';

        const res = await fetch(endpoint, {
          method,
          headers: { 'Content-Type': 'application/json' },
        });

        if (res.ok) {
          const data = await res.json();
          if (isMounted && typeof data.count === 'number') {
            setTargetCount(data.count);
            if (typeof data.activeNow === 'number') {
              setActiveOnline(data.activeNow);
            }
            if (!hasVisitedThisSession) {
              sessionStorage.setItem('jubayer_session_visit', 'true');
            }
            return;
          }
        }
      } catch {
        // Fallback to localStorage persistence if API is not yet reachable
      }

      // Offline / Local fallback
      try {
        const saved = localStorage.getItem('jubayer_local_visitors');
        const current = saved ? parseInt(saved, 10) : 3482;
        const next = sessionStorage.getItem('jubayer_session_visit') ? current : current + 1;
        sessionStorage.setItem('jubayer_session_visit', 'true');
        localStorage.setItem('jubayer_local_visitors', String(next));
        if (isMounted) setTargetCount(next);
      } catch {}
    }

    recordVisit();

    return () => {
      isMounted = false;
    };
  }, []);

  // Smooth count-up animation
  useEffect(() => {
    if (targetCount === 0) return;
    const startCount = displayCount === 0 ? Math.max(0, targetCount - 60) : displayCount;
    const diff = targetCount - startCount;
    if (diff <= 0) {
      setDisplayCount(targetCount);
      return;
    }

    const duration = 1200; // ms
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutExpo
      const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const current = Math.floor(startCount + diff * ease);

      setDisplayCount(current);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setDisplayCount(targetCount);
      }
    };

    const animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
  }, [targetCount]);

  return (
    <div
      className={`w-full rounded-2xl border px-3.5 py-2.5 backdrop-blur-md shadow-md flex items-center justify-between gap-3 transition-all ${
        isLight
          ? 'bg-white/90 border-slate-200 text-slate-800'
          : `${themeConfig.cardBg} ${themeConfig.cardBorder} text-neutral-200`
      }`}
      aria-label="Visitor Counter"
    >
      {/* Left: Animated Visitor Total */}
      <div className="flex items-center gap-2.5 min-w-0">
        <div
          className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${
            isLight
              ? 'bg-blue-50 text-blue-600 border-blue-200'
              : 'bg-neutral-800 text-neutral-300 border-neutral-700/60'
          }`}
        >
          <Users className="w-4 h-4 text-emerald-400" />
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span
              className={`text-base sm:text-lg font-bold font-mono tabular-nums tracking-tight ${
                isLight ? 'text-slate-900' : 'text-white'
              }`}
            >
              {formatNumber(displayCount || targetCount)}
            </span>
            <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-semibold uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="hidden xs:inline">{t.liveVisits}</span>
            </span>
          </div>
          <p className={`text-[11px] truncate leading-tight ${isLight ? 'text-slate-500' : 'text-neutral-400'}`}>
            {t.totalVisitors}
          </p>
        </div>
      </div>

      {/* Right: Active Live Viewing */}
      <div
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-medium border shrink-0 ${
          isLight
            ? 'bg-slate-100/80 border-slate-200 text-slate-700'
            : 'bg-neutral-950/60 border-neutral-800 text-neutral-300'
        }`}
      >
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
        <span className="font-mono text-emerald-400 font-bold">{formatNumber(activeOnline)}</span>
        <span className="text-[11px]">{t.viewingNow}</span>
      </div>
    </div>
  );
}
