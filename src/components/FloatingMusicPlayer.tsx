import React, { useEffect, useRef, useState } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Music2,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { MusicTrack } from '../data/music';
import { Language, TRANSLATIONS } from '../data/i18n';
import { playTapSound } from '../utils/sound';

interface FloatingMusicPlayerProps {
  tracks: MusicTrack[];
  soundEnabled: boolean;
  lang: Language;
}

function formatTime(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export function FloatingMusicPlayer({
  tracks,
  soundEnabled,
  lang,
}: FloatingMusicPlayerProps) {
  const t = TRANSLATIONS[lang];
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playButtonRef = useRef<HTMLButtonElement | null>(null);
  const userPausedRef = useRef(false);
  const autoplayResolvedRef = useRef(false);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.75);
  const [isMuted, setIsMuted] = useState(false);
  const [hasLoadError, setHasLoadError] = useState(false);

  const hasTracks = tracks.length > 0;
  const currentTrack = hasTracks ? tracks[currentIndex % tracks.length] : null;

  // Attempt automatic playback on initial entry; if browser policy blocks unmuted autoplay,
  // automatically start on the user's very first interaction anywhere on the page.
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
      targetAudio.volume = isMuted ? 0 : volume;
      targetAudio.muted = isMuted;

      const playPromise = targetAudio.play();
      if (playPromise && typeof playPromise.then === 'function') {
        playPromise
          .then(() => {
            if (isDisposed) return;
            autoplayResolvedRef.current = true;
            setIsPlaying(true);
            setHasLoadError(false);
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
      // Let Play/Pause button's own click handler toggle cleanly without double-triggering
      if (playButtonRef.current && event.target instanceof Node && playButtonRef.current.contains(event.target)) {
        return;
      }
      tryPlay();
    }

    window.addEventListener('pointerdown', handleFirstInteraction, { capture: true, passive: true });
    window.addEventListener('touchstart', handleFirstInteraction, { capture: true, passive: true });
    window.addEventListener('keydown', handleFirstInteraction, { capture: true, passive: true });
    window.addEventListener('click', handleFirstInteraction, { capture: true, passive: true });

    // Try immediately right on entry
    tryPlay();

    return () => {
      isDisposed = true;
      cleanupListeners();
    };
  }, [hasTracks]);

  // Keep audio element volume/mute in sync
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = isMuted ? 0 : volume;
    audio.muted = isMuted;
  }, [volume, isMuted]);

  // Trigger play when switching tracks if playing
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;
    setCurrentTime(0);
    setHasLoadError(false);

    if (isPlaying) {
      const playPromise = audio.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(() => {
          setIsPlaying(false);
        });
      }
    }
  }, [currentIndex, currentTrack]);

  const handleTogglePlay = () => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;
    playTapSound(soundEnabled);

    if (isPlaying) {
      userPausedRef.current = true;
      autoplayResolvedRef.current = true;
      audio.pause();
      setIsPlaying(false);
    } else {
      userPausedRef.current = false;
      autoplayResolvedRef.current = true;
      setHasLoadError(false);
      const playPromise = audio.play();
      if (playPromise && typeof playPromise.then === 'function') {
        playPromise
          .then(() => {
            setIsPlaying(true);
          })
          .catch(() => {
            setIsPlaying(false);
            setHasLoadError(true);
          });
      } else {
        setIsPlaying(true);
      }
    }
  };

  const handlePrev = () => {
    if (!hasTracks) return;
    playTapSound(soundEnabled);
    // If more than 3s into the song, restart current track first
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

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextTime = Number(e.target.value);
    if (audioRef.current && Number.isFinite(nextTime)) {
      audioRef.current.currentTime = nextTime;
      setCurrentTime(nextTime);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextVol = Number(e.target.value);
    setVolume(nextVol);
    if (nextVol > 0 && isMuted) {
      setIsMuted(false);
    }
  };

  const toggleMute = () => {
    playTapSound(soundEnabled);
    setIsMuted((prev) => !prev);
  };

  const displayDuration = duration > 0 ? duration : currentTrack?.durationSec || 0;
  const progressPercent =
    displayDuration > 0 ? Math.min(100, (currentTime / displayDuration) * 100) : 0;

  return (
    <aside
      aria-label={t.musicTitle}
      className="fixed bottom-3 right-3 sm:bottom-5 sm:right-5 z-40 w-[calc(100vw-24px)] max-w-[348px]"
    >
      {/* Hidden audio element — plays AAC stream from uploaded .mp4 tracks */}
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

      {/* Main Dark Blue Glassmorphism Container */}
      <div className="rounded-2xl bg-[#071128]/90 backdrop-blur-xl border border-amber-400/25 shadow-[0_14px_38px_rgba(3,9,24,0.75)] text-white overflow-hidden transition-all duration-300">
        {/* Expanded Drawer: Seek Bar + Volume Control + Playlist */}
        {isExpanded && hasTracks && currentTrack && (
          <div className="px-3.5 pt-3 pb-2.5 border-b border-white/10 space-y-3 bg-[#050d20]/70">
            {/* Seek / Progress Control */}
            <div className="space-y-1">
              <input
                type="range"
                min={0}
                max={displayDuration || 100}
                step={0.5}
                value={Math.min(currentTime, displayDuration || 100)}
                onChange={handleSeek}
                aria-label="Seek track"
                className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-white/15 accent-amber-400"
              />
              <div className="flex items-center justify-between text-[10px] font-mono text-slate-300/80">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(displayDuration)}</span>
              </div>
            </div>

            {/* Volume Control */}
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={toggleMute}
                aria-label={isMuted ? t.musicUnmute : t.musicMute}
                title={isMuted ? t.musicUnmute : t.musicMute}
                className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/15 text-amber-300 flex items-center justify-center transition-colors shrink-0"
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-3.5 h-3.5" />
                ) : (
                  <Volume2 className="w-3.5 h-3.5" />
                )}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.02}
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                aria-label="Volume"
                className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer bg-white/15 accent-amber-400"
              />
              <span className="text-[10px] font-mono text-slate-300/80 w-8 text-right">
                {Math.round((isMuted ? 0 : volume) * 100)}%
              </span>
            </div>

            {/* Playlist Track List */}
            <div className="space-y-1 max-h-36 overflow-y-auto pr-0.5">
              <div className="text-[10px] uppercase tracking-wider text-amber-300/80 font-semibold px-1 pb-0.5">
                {t.musicPlaylist}
              </div>
              {tracks.map((track, idx) => {
                const isActive = idx === currentIndex;
                return (
                  <button
                    key={track.id}
                    type="button"
                    onClick={() => handleSelectTrack(idx)}
                    className={`w-full px-2.5 py-1.5 rounded-xl flex items-center justify-between gap-2 text-left transition-colors ${
                      isActive
                        ? 'bg-amber-400/15 border border-amber-400/35 text-amber-200'
                        : 'hover:bg-white/8 text-slate-200 border border-transparent'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium truncate">
                        {lang === 'bn' ? track.titleBn : track.title}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate">{track.artist}</p>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400 shrink-0">
                      {formatTime(track.durationSec)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Compact Always-Visible Control Bar */}
        {!hasTracks ? (
          <div className="px-3.5 py-3 flex items-center gap-2.5 text-slate-300">
            <div className="w-8 h-8 rounded-xl bg-amber-400/15 border border-amber-400/30 flex items-center justify-center text-amber-300 shrink-0">
              <Music2 className="w-4 h-4" />
            </div>
            <p className="text-xs font-medium truncate">{t.musicNoTracks}</p>
          </div>
        ) : (
          <div className="relative">
            {/* Subtle Golden Progress Line at Top of Compact Bar */}
            <div className="h-[2px] w-full bg-white/10">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-amber-300 transition-[width] duration-200"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <div className="px-3 py-2 flex items-center justify-between gap-2">
              {/* Left: Music Icon + Track Info */}
              <button
                type="button"
                onClick={() => {
                  playTapSound(soundEnabled);
                  setIsExpanded((prev) => !prev);
                }}
                className="flex items-center gap-2.5 min-w-0 flex-1 text-left group"
                aria-label={isExpanded ? 'Collapse player' : 'Expand player'}
              >
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border transition-all ${
                    isPlaying
                      ? 'bg-amber-400/20 border-amber-400/50 text-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.25)]'
                      : 'bg-white/8 border-white/15 text-amber-300/90 group-hover:border-amber-400/40'
                  }`}
                >
                  <Music2 className={`w-4 h-4 ${isPlaying ? 'animate-pulse' : ''}`} />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-white truncate">
                    {currentTrack
                      ? lang === 'bn'
                        ? currentTrack.titleBn
                        : currentTrack.title
                      : t.musicTitle}
                  </p>
                  <p className="text-[10px] text-slate-300/80 truncate">
                    {hasLoadError
                      ? t.musicNoTracks
                      : `${currentTrack?.artist ?? ''} · ${formatTime(currentTime)}`}
                  </p>
                </div>
              </button>

              {/* Right: Prev / Play-Pause / Next / Volume & Expand */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={handlePrev}
                  aria-label={t.musicPrev}
                  title={t.musicPrev}
                  className="w-7 h-7 rounded-lg hover:bg-white/10 text-slate-200 hover:text-amber-300 flex items-center justify-center transition-colors"
                >
                  <SkipBack className="w-3.5 h-3.5" />
                </button>

                <button
                  ref={playButtonRef}
                  type="button"
                  onClick={handleTogglePlay}
                  aria-label={isPlaying ? t.musicPause : t.musicPlay}
                  title={isPlaying ? t.musicPause : t.musicPlay}
                  className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-[#060d1f] flex items-center justify-center shadow-[0_2px_12px_rgba(251,191,36,0.35)] transition-transform active:scale-95"
                >
                  {isPlaying ? (
                    <Pause className="w-3.5 h-3.5 fill-current" />
                  ) : (
                    <Play className="w-3.5 h-3.5 fill-current translate-x-[0.5px]" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleNext}
                  aria-label={t.musicNext}
                  title={t.musicNext}
                  className="w-7 h-7 rounded-lg hover:bg-white/10 text-slate-200 hover:text-amber-300 flex items-center justify-center transition-colors"
                >
                  <SkipForward className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={toggleMute}
                  aria-label={isMuted ? t.musicUnmute : t.musicMute}
                  title={isMuted ? t.musicUnmute : t.musicMute}
                  className="w-7 h-7 rounded-lg hover:bg-white/10 text-slate-300 hover:text-amber-300 flex items-center justify-center transition-colors"
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX className="w-3.5 h-3.5" />
                  ) : (
                    <Volume2 className="w-3.5 h-3.5" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    playTapSound(soundEnabled);
                    setIsExpanded((prev) => !prev);
                  }}
                  aria-label={isExpanded ? 'Hide playlist & volume' : 'Show playlist & volume'}
                  className="w-7 h-7 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
                >
                  {isExpanded ? (
                    <ChevronDown className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronUp className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
