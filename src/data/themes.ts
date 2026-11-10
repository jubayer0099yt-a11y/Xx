export interface ThemeConfig {
  id: string;
  name: string;
  shortName: string;
  swatchGradient: string;
  badgeDot: string;
  bgStyle: React.CSSProperties;
  accentText: string;
  accentBg: string;
  accentBorder: string;
  cardBorder: string;
  cardHoverBorder: string;
  cardBg: string;
  avatarRing: string;
  bannerGradient: string;
  glowColor1: string;
  glowColor2: string;
  textColor: string;
  mutedTextColor: string;
  isLight?: boolean;
}

export const THEME_CONFIGS: Record<string, ThemeConfig> = {
  signature: {
    id: 'signature',
    name: 'Red & Blue (Avatar Vibe)',
    shortName: 'Red/Blue',
    swatchGradient: 'from-red-500 via-purple-500 to-blue-500',
    badgeDot: '#ef4444',
    bgStyle: {
      backgroundColor: '#0a0a10',
      backgroundImage: `
        radial-gradient(circle at 15% 15%, rgba(239, 68, 68, 0.22) 0%, transparent 45%),
        radial-gradient(circle at 85% 20%, rgba(59, 130, 246, 0.22) 0%, transparent 45%),
        radial-gradient(circle at 50% 80%, rgba(168, 85, 247, 0.15) 0%, transparent 50%)
      `,
    },
    accentText: 'text-red-400',
    accentBg: 'bg-red-600 hover:bg-red-500 text-white',
    accentBorder: 'border-red-500/50',
    cardBorder: 'border-red-500/20',
    cardHoverBorder: 'hover:border-red-400/80 hover:shadow-[0_0_20px_rgba(239,68,68,0.2)]',
    cardBg: 'bg-neutral-900/85',
    avatarRing: 'from-red-500 via-purple-500 to-blue-500 shadow-red-500/30',
    bannerGradient: 'from-red-600/35 via-neutral-950/80 to-blue-600/35',
    glowColor1: 'rgba(239, 68, 68, 0.25)',
    glowColor2: 'rgba(59, 130, 246, 0.25)',
    textColor: 'text-neutral-100',
    mutedTextColor: 'text-neutral-400',
  },
  cyan: {
    id: 'cyan',
    name: 'Electric Cyan & Ice',
    shortName: 'Cyan',
    swatchGradient: 'from-cyan-400 to-blue-600',
    badgeDot: '#06b6d4',
    bgStyle: {
      backgroundColor: '#040d16',
      backgroundImage: `
        radial-gradient(circle at 20% 15%, rgba(6, 182, 212, 0.25) 0%, transparent 45%),
        radial-gradient(circle at 80% 25%, rgba(37, 99, 235, 0.25) 0%, transparent 45%),
        radial-gradient(circle at 50% 85%, rgba(14, 165, 233, 0.15) 0%, transparent 50%)
      `,
    },
    accentText: 'text-cyan-400',
    accentBg: 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold',
    accentBorder: 'border-cyan-500/50',
    cardBorder: 'border-cyan-500/25',
    cardHoverBorder: 'hover:border-cyan-400/80 hover:shadow-[0_0_20px_rgba(6,182,212,0.25)]',
    cardBg: 'bg-slate-900/85',
    avatarRing: 'from-cyan-400 via-teal-400 to-blue-500 shadow-cyan-500/30',
    bannerGradient: 'from-cyan-500/35 via-slate-950/80 to-blue-600/35',
    glowColor1: 'rgba(6, 182, 212, 0.28)',
    glowColor2: 'rgba(59, 130, 246, 0.25)',
    textColor: 'text-slate-100',
    mutedTextColor: 'text-slate-400',
  },
  emerald: {
    id: 'emerald',
    name: 'Cyber Emerald (Green)',
    shortName: 'Emerald',
    swatchGradient: 'from-emerald-400 to-teal-600',
    badgeDot: '#10b981',
    bgStyle: {
      backgroundColor: '#041009',
      backgroundImage: `
        radial-gradient(circle at 20% 15%, rgba(16, 185, 129, 0.25) 0%, transparent 45%),
        radial-gradient(circle at 80% 25%, rgba(20, 184, 166, 0.22) 0%, transparent 45%),
        radial-gradient(circle at 50% 85%, rgba(5, 150, 105, 0.18) 0%, transparent 50%)
      `,
    },
    accentText: 'text-emerald-400',
    accentBg: 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold',
    accentBorder: 'border-emerald-500/50',
    cardBorder: 'border-emerald-500/25',
    cardHoverBorder: 'hover:border-emerald-400/80 hover:shadow-[0_0_20px_rgba(16,185,129,0.25)]',
    cardBg: 'bg-zinc-900/85',
    avatarRing: 'from-emerald-400 via-green-500 to-teal-400 shadow-emerald-500/30',
    bannerGradient: 'from-emerald-500/35 via-zinc-950/80 to-teal-600/35',
    glowColor1: 'rgba(16, 185, 129, 0.28)',
    glowColor2: 'rgba(20, 184, 166, 0.25)',
    textColor: 'text-zinc-100',
    mutedTextColor: 'text-zinc-400',
  },
  purple: {
    id: 'purple',
    name: 'Royal Purple & Amethyst',
    shortName: 'Purple',
    swatchGradient: 'from-purple-500 to-pink-500',
    badgeDot: '#a855f7',
    bgStyle: {
      backgroundColor: '#0c0715',
      backgroundImage: `
        radial-gradient(circle at 20% 15%, rgba(168, 85, 247, 0.25) 0%, transparent 45%),
        radial-gradient(circle at 80% 25%, rgba(236, 72, 153, 0.22) 0%, transparent 45%),
        radial-gradient(circle at 50% 85%, rgba(139, 92, 246, 0.18) 0%, transparent 50%)
      `,
    },
    accentText: 'text-purple-400',
    accentBg: 'bg-purple-600 hover:bg-purple-500 text-white',
    accentBorder: 'border-purple-500/50',
    cardBorder: 'border-purple-500/25',
    cardHoverBorder: 'hover:border-purple-400/80 hover:shadow-[0_0_20px_rgba(168,85,247,0.25)]',
    cardBg: 'bg-neutral-900/85',
    avatarRing: 'from-purple-500 via-pink-500 to-indigo-500 shadow-purple-500/30',
    bannerGradient: 'from-purple-600/35 via-neutral-950/80 to-pink-600/35',
    glowColor1: 'rgba(168, 85, 247, 0.28)',
    glowColor2: 'rgba(236, 72, 153, 0.22)',
    textColor: 'text-neutral-100',
    mutedTextColor: 'text-neutral-400',
  },
  amber: {
    id: 'amber',
    name: 'Sunset Gold & Amber',
    shortName: 'Gold',
    swatchGradient: 'from-amber-400 to-orange-500',
    badgeDot: '#f59e0b',
    bgStyle: {
      backgroundColor: '#120b05',
      backgroundImage: `
        radial-gradient(circle at 20% 15%, rgba(245, 158, 11, 0.24) 0%, transparent 45%),
        radial-gradient(circle at 80% 25%, rgba(249, 115, 22, 0.22) 0%, transparent 45%),
        radial-gradient(circle at 50% 85%, rgba(234, 88, 12, 0.16) 0%, transparent 50%)
      `,
    },
    accentText: 'text-amber-400',
    accentBg: 'bg-amber-500 hover:bg-amber-400 text-neutral-950 font-semibold',
    accentBorder: 'border-amber-500/50',
    cardBorder: 'border-amber-500/25',
    cardHoverBorder: 'hover:border-amber-400/80 hover:shadow-[0_0_20px_rgba(245,158,11,0.25)]',
    cardBg: 'bg-neutral-900/85',
    avatarRing: 'from-amber-400 via-orange-500 to-yellow-400 shadow-amber-500/30',
    bannerGradient: 'from-amber-500/35 via-neutral-950/80 to-orange-600/35',
    glowColor1: 'rgba(245, 158, 11, 0.26)',
    glowColor2: 'rgba(249, 115, 22, 0.22)',
    textColor: 'text-neutral-100',
    mutedTextColor: 'text-neutral-400',
  },
  light: {
    id: 'light',
    name: 'Minimal Clean Light',
    shortName: 'Light',
    swatchGradient: 'from-neutral-200 to-white',
    badgeDot: '#3b82f6',
    bgStyle: {
      backgroundColor: '#f8fafc',
      backgroundImage: `
        radial-gradient(circle at 20% 15%, rgba(239, 68, 68, 0.1) 0%, transparent 45%),
        radial-gradient(circle at 80% 25%, rgba(59, 130, 246, 0.1) 0%, transparent 45%),
        radial-gradient(circle at 50% 85%, rgba(147, 197, 253, 0.15) 0%, transparent 50%)
      `,
    },
    accentText: 'text-blue-600',
    accentBg: 'bg-blue-600 hover:bg-blue-500 text-white',
    accentBorder: 'border-blue-400/50',
    cardBorder: 'border-neutral-200/90',
    cardHoverBorder: 'hover:border-blue-500/70 hover:shadow-[0_4px_20px_rgba(59,130,246,0.15)]',
    cardBg: 'bg-white/95',
    avatarRing: 'from-red-500 via-purple-500 to-blue-500 shadow-blue-500/20',
    bannerGradient: 'from-red-500/20 via-slate-100 to-blue-500/20',
    glowColor1: 'rgba(239, 68, 68, 0.1)',
    glowColor2: 'rgba(59, 130, 246, 0.12)',
    textColor: 'text-slate-900',
    mutedTextColor: 'text-slate-500',
    isLight: true,
  },
};
