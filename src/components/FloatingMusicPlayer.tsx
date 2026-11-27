import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Music2,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { MusicTrack } from '../data/music';
import { ThemeConfig } from '../data/themes';
import { Language, TRANSLATIONS } from '../data/i18n';
import { playTapSound } from '../utils/sound';

interface FloatingMusicPlayerProps {
  tracks: MusicTrack[];
  soundEnabled: boolean;
  themeConfig: ThemeConfig;
  lang: Language;
}

function formatTime(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

function EqualizerBars({ active, compact = false }: { active: boolean; compact?: boolean }) {
  return (
    <span
      className={`inline-flex items-end justify-center ${
        compact ? 'gap-[1.5px] h-2.5' : 'gap-[2px] h-3.5'
      }`}
      aria-hidden="true"
    >
      <span
        className={`w-[2px] h-full rounded-full transition-transform duration-300 ${
          active ? 'bg-amber-400 animate-music-eq-1' : 'bg-amber-300/45 scale-y-[0.35]'
        }`}
      />
      <span
        className={`w-[2px] h-full rounded-full transition-transform duration-300 ${
          active ? 'bg-amber-300 animate-music-eq-2' : 'bg-amber-300/45 scale-y-[0.55]'
        }`}
      />
      <span
        className={`w-[2px] h-full rounded-full transition-transform duration-300 ${
          active ? 'bg-amber-400 animate-music-eq-3' : 'bg-amber-300/45 scale-y-[0.4]'
        }`}
      />
    </span>
  );
}

const TARGET_VOLUME = 0.8;

export function FloatingMusicPlayer({
  tracks,
  soundEnabled,
  themeConfig,
  lang,
}: FloatingMusicPlayerProps) {
  const t = TRANSLATIONS[lang];
  const isLight = Boolean(themeConfig.isLight);

  const menuRef = useRef<HTMLDivElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playButtonRef = useRef<HTMLButtonElement | null>(null);
  const fadeRafRef = useRef<number | null>(null);
  const userPausedRef = useRef(false);
  const autoplayResolvedRef = useRef(false);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [hasLoadError, setHasLoadError] = useState(false);

  const hasTracks = tracks.length > 0;
  const currentTrack = hasTracks ? tracks[currentIndex % tracks.length] : null;

  // Smooth volume ramp helper for silky fade-in and fade-out
  const fadeAudioTo = useCallback(
    (targetVolume: number, durationMs: number, onComplete?: () => void) => {
      const audio = audioRef.current;
      if (!audio) {
        onComplete?.();
        return;
      }

      if (fadeRafRef.current !== null) {
        cancelAnimationFrame(fadeRafRef.current);
        fadeRafRef.current = null;
      }

      const startVolume = audio.volume;
      const startTime = performance.now();

      const step = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(1, elapsed / durationMs);
        // Smooth easeOutCubic
        const eased = 1 - Math.pow(1 - progress, 3);
        const nextVol = startVolume + (targetVolume - startVolume) * eased;
        audio.volume = Math.max(0, Math.min(1, nextVol));

        if (progress < 1) {
          fadeRafRef.current = requestAnimationFrame(step);
        } else {
          fadeRafRef.current = null;
          onComplete?.();
        }
      };

      fadeRafRef.current = requestAnimationFrame(step);
    },
    []
  );

  // Cancel active fade RAF on unmount
  useEffect(() => {
    return () => {
      if (fadeRafRef.current !== null) {
        cancelAnimationFrame(fadeRafRef.current);
      }
    };
  }, []);

  // Close popover when clicking outside or pressing Escape (audio keeps playing)
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside, { passive: true });
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Attempt automatic playback on initial entry; if browser policy blocks unmuted autoplay,
  // automatically start smoothly on the user's very first interaction anywhere on the page.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !hasTracks || autoplayResolvedRef.current) return;

    let isDisposed = false;

    const cleanupListeners = () => {
      window.removeEventListener('pointerdown', handleFirstInteraction, true);
      window.removeEventListener('touchstart', handleFirstInteraction, true);
      window.removeEventListener('keydown', handleFirstInteraction, true);
      window.removeEventListener('click', handleFirstInteraction, true);
    };

    const tryPlay = () => {
      const targetAudio = audioRef.current;
      if (!targetAudio || isDisposed || userPausedRef.current || autoplayResolvedRef.current) {
        return;
      }
      targetAudio.volume = 0.02;
      targetAudio.muted = false;

      const playPromise = targetAudio.play();
      if (playPromise && typeof playPromise.then === 'function') {
        playPromise
          .then(() => {
            if (isDisposed) return;
            autoplayResolvedRef.current = true;
            setIsPlaying(true);
            setHasLoadError(false);
            fadeAudioTo(TARGET_VOLUME, 450);
            cleanupListeners();
          })
          .catch(() => {
            // Browser blocked immediate unmuted autoplay; wait for first user gesture
          });
      }
    };

    function handleFirstInteraction(event: Event) {
      if (userPausedRef.current || autoplayResolvedRef.current) {
        cleanupListeners();
        return;
      }
      if (
        playButtonRef.current &&
        event.target instanceof Node &&
        playButtonRef.current.contains(event.target)
      ) {
        return;
      }
      tryPlay();
    }

    window.addEventListener('pointerdown', handleFirstInteraction, { capture: true, passive: true });
    window.addEventListener('touchstart', handleFirstInteraction, { capture: true, passive: true });
    window.addEventListener('keydown', handleFirstInteraction, { capture: true, passive: true });
    window.addEventListener('click', handleFirstInteraction, { capture: true, passive: true });

    tryPlay();

    return () => {
      isDisposed = true;
      cleanupListeners();
    };
  }, [hasTracks, fadeAudioTo]);

  // Trigger smooth fade-in when switching tracks while playing
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;
    setCurrentTime(0);
    setHasLoadError(false);

    if (isPlaying) {
      audio.volume = 0.02;
      const playPromise = audio.play();
      if (playPromise && typeof playPromise.then === 'function') {
        playPromise
          .then(() => {
            fadeAudioTo(TARGET_VOLUME, 320);
          })
          .catch(() => {
            setIsPlaying(false);
          });
      }
    }
  }, [currentIndex, currentTrack, fadeAudioTo]);

  const handleTogglePlay = () => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;
    playTapSound(soundEnabled);

    if (isPlaying) {
      userPausedRef.current = true;
      autoplayResolvedRef.current = true;
      setIsPlaying(false);
      fadeAudioTo(0, 180, () => {
        audio.pause();
        audio.volume = TARGET_VOLUME;
      });
    } else {
      userPausedRef.current = false;
      autoplayResolvedRef.current = true;
      setHasLoadError(false);
      audio.volume = 0.02;
      const playPromise = audio.play();
      if (playPromise && typeof playPromise.then === 'function') {
        playPromise
          .then(() => {
            setIsPlaying(true);
            fadeAudioTo(TARGET_VOLUME, 320);
          })
          .catch(() => {
            setIsPlaying(false);
            setHasLoadError(true);
          });
      } else {
        setIsPlaying(true);
        fadeAudioTo(TARGET_VOLUME, 320);
      }
    }
  };

  const handlePrev = () => {
    if (!hasTracks) return;
    playTapSound(soundEnabled);
    if (audioRef.current && audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0;
      setCurrentTime(0);
      return;
    }
    setCurrentIndex((prev) => (prev - 1 + tracks.length) % tracks.length);
  };

  const handleNext = () => {
    if (!hasTracks) return;
    playTapSound(soundEnabled);
    setCurrentIndex((prev) => (prev + 1) % tracks.length);
  };

  const handleSelectTrack = (idx: number) => {
    playTapSound(soundEnabled);
    userPausedRef.current = false;
    autoplayResolvedRef.current = true;
    if (idx === currentIndex) {
      handleTogglePlay();
      return;
    }
    setCurrentIndex(idx);
    setIsPlaying(true);
  };

  const displayDuration = duration > 0 ? duration : currentTrack?.durationSec || 0;
  const progressPercent =
    displayDuration > 0 ? Math.min(100, (currentTime / displayDuration) * 100) : 0;

  return (
    <div className="relative" ref={menuRef}>
      {/* Persistent audio element — plays AAC stream from uploaded .mp4 tracks */}
      {currentTrack && (
        <audio
          ref={audioRef}
          src={currentTrack.src}
          preload="auto"
          autoPlay
          onPlay={() => {
            autoplayResolvedRef.current = true;
            setIsPlaying(true);
            setHasLoadError(false);
            if (audioRef.current && audioRef.current.volume < TARGET_VOLUME - 0.05) {
              fadeAudioTo(TARGET_VOLUME, 400);
            }
          }}
          onLoadedMetadata={() => {
            if (audioRef.current && Number.isFinite(audioRef.current.duration)) {
              setDuration(audioRef.current.duration);
            }
          }}
          onTimeUpdate={() => {
            if (audioRef.current) {
              setCurrentTime(audioRef.current.currentTime);
            }
          }}
          onEnded={() => {
            if (tracks.length > 1) {
              setCurrentIndex((prev) => (prev + 1) % tracks.length);
            } else {
              setIsPlaying(false);
              setCurrentTime(0);
            }
          }}
          onError={() => {
            setIsPlaying(false);
            setHasLoadError(true);
          }}
        />
      )}

      {/* Compact Top Header Button (matches Color Theme button style with silky equalizer dot) */}
      <button
        type="button"
        onClick={() => {
          playTapSound(soundEnabled);
          setIsOpen((prev) => !prev);
        }}
        aria-label={t.musicTitle}
        title={t.musicTitle}
        aria-expanded={isOpen}
        className={`h-8 sm:h-9 px-2 sm:px-2.5 rounded-xl border flex items-center gap-1.5 transition-all duration-300 ease-out active:scale-95 ${
          isOpen
            ? `${themeConfig.accentBg} shadow-md`
            : isLight
              ? 'bg-white hover:bg-slate-100 text-slate-800 border-slate-200 shadow-sm'
              : 'bg-neutral-900/90 hover:bg-neutral-800 text-neutral-200 border-neutral-800 shadow-sm hover:border-amber-400/35'
        }`}
      >
        <Music2
          className={`w-3.5 h-3.5 transition-colors duration-300 ${
            isPlaying && !isOpen ? 'text-amber-400' : ''
          }`}
        />
        <EqualizerBars active={isPlaying} compact />
      </button>

      {/* Smooth Animated Luxury Glassmorphism Player Popover */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            role="dialog"
            aria-label={t.musicTitle}
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.96 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            className="fixed right-3 top-14 sm:absolute sm:right-0 sm:top-full sm:mt-2.5 w-[calc(100vw-24px)] max-w-[320px] sm:w-[320px] rounded-2xl bg-gradient-to-b from-[#091634]/95 via-[#071128]/95 to-[#050c1e]/98 backdrop-blur-2xl border border-amber-400/30 shadow-[0_22px_60px_rgba(2,6,18,0.88),inset_0_1px_0_rgba(255,255,255,0.08)] text-white overflow-hidden z-50 origin-top-right"
          >
            {/* Top Subtle Golden Rim Glow */}
            <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-amber-400/70 to-transparent" />

            {!hasTracks ? (
              <div className="p-4 flex items-center gap-3 text-slate-300">
                <div className="w-9 h-9 rounded-xl bg-amber-400/15 border border-amber-400/30 flex items-center justify-center text-amber-300 shrink-0">
                  <Music2 className="w-4 h-4" />
                </div>
                <p className="text-xs font-medium">{t.musicNoTracks}</p>
              </div>
            ) : (
              <div>
                {/* Smooth Glowing Progress Line */}
                <div className="h-[2.5px] w-full bg-white/8 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 via-amber-300 to-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.7)] transition-[width] duration-300 ease-linear"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>

                <div className="p-4 space-y-3.5">
                  {/* Active Track Card & Transport Controls */}
                  <div className="flex items-center justify-between gap-2.5">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div
                        className={`relative w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border transition-all duration-300 ${
                          isPlaying
                            ? 'bg-gradient-to-br from-amber-400/20 to-amber-500/10 border-amber-400/50 shadow-[0_0_18px_rgba(251,191,36,0.22)]'
                            : 'bg-white/6 border-white/12'
                        }`}
                      >
                        <EqualizerBars active={isPlaying} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-display font-semibold text-white tracking-wide truncate">
                          {currentTrack
                            ? lang === 'bn'
                              ? currentTrack.titleBn
                              : currentTrack.title
                            : t.musicTitle}
                        </p>
                        <p className="text-[11px] font-mono tabular-nums text-amber-200/75 truncate mt-0.5">
                          {hasLoadError
                            ? t.musicNoTracks
                            : `${formatTime(currentTime)} / ${formatTime(displayDuration)}`}
                        </p>
                      </div>
                    </div>

                    {/* Prev / Play-Pause / Next */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={handlePrev}
                        aria-label={t.musicPrev}
                        title={t.musicPrev}
                        className="w-7 h-7 rounded-lg hover:bg-white/10 text-slate-300 hover:text-amber-300 flex items-center justify-center transition-all duration-200 active:scale-90"
                      >
                        <SkipBack className="w-3.5 h-3.5" />
                      </button>

                      <button
                        ref={playButtonRef}
                        type="button"
                        onClick={handleTogglePlay}
                        aria-label={isPlaying ? t.musicPause : t.musicPlay}
                        title={isPlaying ? t.musicPause : t.musicPlay}
                        className={`w-9 h-9 rounded-full bg-gradient-to-br from-amber-300 via-amber-400 to-amber-500 hover:from-amber-200 hover:to-amber-400 text-[#060d1f] flex items-center justify-center transition-all duration-200 active:scale-92 ${
                          isPlaying
                            ? 'shadow-[0_0_20px_rgba(251,191,36,0.45)] ring-2 ring-amber-300/35'
                            : 'shadow-[0_4px_14px_rgba(251,191,36,0.3)]'
                        }`}
                      >
                        {isPlaying ? (
                          <Pause className="w-4 h-4 fill-current" />
                        ) : (
                          <Play className="w-4 h-4 fill-current translate-x-[0.5px]" />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={handleNext}
                        aria-label={t.musicNext}
                        title={t.musicNext}
                        className="w-7 h-7 rounded-lg hover:bg-white/10 text-slate-300 hover:text-amber-300 flex items-center justify-center transition-all duration-200 active:scale-90"
                      >
                        <SkipForward className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Sleek Playlist */}
                  <div className="pt-2.5 border-t border-white/10 space-y-1.5 max-h-44 overflow-y-auto pr-0.5">
                    <div className="text-[10px] uppercase tracking-[0.18em] text-amber-300/80 font-semibold px-1.5 pb-0.5">
                      {t.musicPlaylist}
                    </div>
                    {tracks.map((track, idx) => {
                      const isActive = idx === currentIndex;
                      return (
                        <button
                          key={track.id}
                          type="button"
                          onClick={() => handleSelectTrack(idx)}
                          className={`w-full px-3 py-2 rounded-xl flex items-center justify-between gap-2.5 text-left transition-all duration-200 active:scale-[0.99] ${
                            isActive
                              ? 'bg-gradient-to-r from-amber-400/20 to-amber-500/10 border border-amber-400/40 text-amber-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]'
                              : 'hover:bg-white/8 text-slate-200 border border-transparent hover:border-white/10'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <span
                              className={`w-5 h-5 rounded-lg flex items-center justify-center text-[10px] font-mono shrink-0 transition-colors ${
                                isActive
                                  ? 'bg-amber-400/25 text-amber-300'
                                  : 'bg-white/6 text-slate-400'
                              }`}
                            >
                              {isActive && isPlaying ? (
                                <EqualizerBars active compact />
                              ) : (
                                idx + 1
                              )}
                            </span>
                            <p className="text-xs font-medium truncate">
                              {lang === 'bn' ? track.titleBn : track.title}
                            </p>
                          </div>
                          <span className="text-[10px] font-mono tabular-nums text-slate-400 shrink-0">
                            {formatTime(track.durationSec)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
