import React, { useState } from 'react';
import { Share2, Volume2, VolumeX, Copy, Check, Mail, Sparkles, QrCode } from 'lucide-react';
import { ProfileData, ThemePreset } from '../types';
import { VerifiedBadgeIcon } from './Icons';
import { playCopySound, playTapSound } from '../utils/sound';

interface HeaderProps {
  profile: ProfileData;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onOpenShareModal: () => void;
  onShowToast: (msg: string) => void;
  currentTheme: ThemePreset;
  onSelectTheme: (theme: ThemePreset) => void;
}

export function Header({
  profile,
  soundEnabled,
  onToggleSound,
  onOpenShareModal,
  onShowToast,
  currentTheme,
  onSelectTheme,
}: HeaderProps) {
  const [copiedHandle, setCopiedHandle] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [coverError, setCoverError] = useState(false);

  const handleCopyHandle = async () => {
    try {
      await navigator.clipboard.writeText(profile.handle);
      setCopiedHandle(true);
      playCopySound(soundEnabled);
      onShowToast(`Copied ${profile.handle} to clipboard!`);
      setTimeout(() => setCopiedHandle(false), 2000);
    } catch {
      onShowToast('Could not copy handle');
    }
  };

  return (
    <header className="relative w-full overflow-hidden">
      {/* Top utility row */}
      <div className="w-full max-w-2xl mx-auto px-4 pt-4 pb-2 flex items-center justify-between gap-4 z-20 relative">
        <div className="flex items-center gap-2">
          <span className="font-display font-bold text-sm tracking-wider text-neutral-300 uppercase">
            Jubayer Links
          </span>
          <span className="text-neutral-600" aria-hidden="true">·</span>
          <span className="text-xs text-neutral-400 font-mono">Official Hub</span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Sound Toggle */}
          <button
            onClick={onToggleSound}
            aria-label={soundEnabled ? 'Mute tap audio' : 'Enable tap audio'}
            title={soundEnabled ? 'Mute audio feedback' : 'Enable audio feedback'}
            className="w-9 h-9 rounded-xl bg-neutral-900/80 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-800 flex items-center justify-center transition-colors"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-indigo-400" /> : <VolumeX className="w-4 h-4 text-neutral-500" />}
          </button>

          {/* Theme Quick Switcher */}
          <div className="flex items-center bg-neutral-900/80 p-0.5 rounded-xl border border-neutral-800">
            <button
              onClick={() => {
                playTapSound(soundEnabled);
                onSelectTheme('obsidian');
              }}
              title="Obsidian Violet Theme"
              className={`w-7 h-7 rounded-lg text-xs font-medium transition-all flex items-center justify-center ${
                currentTheme === 'obsidian' ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40' : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block" />
            </button>
            <button
              onClick={() => {
                playTapSound(soundEnabled);
                onSelectTheme('midnight');
              }}
              title="Midnight Cyan Theme"
              className={`w-7 h-7 rounded-lg text-xs font-medium transition-all flex items-center justify-center ${
                currentTheme === 'midnight' ? 'bg-cyan-600/30 text-cyan-300 border border-cyan-500/40' : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 inline-block" />
            </button>
            <button
              onClick={() => {
                playTapSound(soundEnabled);
                onSelectTheme('emerald');
              }}
              title="Cyber Emerald Theme"
              className={`w-7 h-7 rounded-lg text-xs font-medium transition-all flex items-center justify-center ${
                currentTheme === 'emerald' ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40' : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" />
            </button>
          </div>

          {/* Share Profile Button */}
          <button
            onClick={() => {
              playTapSound(soundEnabled);
              onOpenShareModal();
            }}
            aria-label="Share profile"
            title="Share Profile & QR Code"
            className="h-9 px-3 rounded-xl bg-neutral-900/80 hover:bg-neutral-800 text-neutral-200 hover:text-white border border-neutral-800 flex items-center gap-1.5 text-xs font-medium transition-colors"
          >
            <Share2 className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden xs:inline">Share</span>
          </button>
        </div>
      </div>

      {/* Cover Banner with smooth gradient vignette */}
      <div className="w-full max-w-2xl mx-auto px-4 pt-2">
        <div className="relative h-40 sm:h-48 w-full rounded-3xl overflow-hidden border border-neutral-800/80 shadow-2xl bg-neutral-900">
          {!coverError ? (
            <img
              src={profile.coverUrl}
              alt="Jubayer Cover Banner"
              referrerPolicy="no-referrer"
              onError={() => setCoverError(true)}
              className="w-full h-full object-cover object-center filter brightness-90 contrast-105"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-neutral-900 via-indigo-950/60 to-neutral-900 flex items-center justify-center" />
          )}

          {/* Scrim overlay for depth */}
          <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/30 to-transparent" />

          {/* QR badge trigger on cover top right */}
          <button
            onClick={() => {
              playTapSound(soundEnabled);
              onOpenShareModal();
            }}
            className="absolute top-3 right-3 px-2.5 py-1.5 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 text-white/90 hover:text-white text-xs flex items-center gap-1.5 transition-colors"
            title="View QR Code"
          >
            <QrCode className="w-3.5 h-3.5 text-indigo-300" />
            <span>QR Code</span>
          </button>
        </div>
      </div>

      {/* Profile Avatar & Identity Lockup */}
      <div className="w-full max-w-2xl mx-auto px-4 -mt-16 sm:-mt-20 relative z-10 flex flex-col items-center text-center">
        {/* Avatar with verified badge */}
        <div className="relative group cursor-pointer" onClick={handleCopyHandle}>
          <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full p-1 bg-gradient-to-tr from-indigo-500 via-purple-500 to-cyan-400 shadow-2xl shadow-indigo-500/20">
            <div className="w-full h-full rounded-full overflow-hidden bg-neutral-900 border-2 border-neutral-950 relative">
              {!imageError ? (
                <img
                  src={profile.avatarUrl}
                  alt={profile.name}
                  referrerPolicy="no-referrer"
                  onError={() => setImageError(true)}
                  className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-indigo-950 text-indigo-300 font-display font-bold text-2xl">
                  {profile.name.slice(0, 2)}
                </div>
              )}
            </div>
          </div>

          {/* Verified Badge */}
          <div
            className="absolute bottom-1 right-1 w-8 h-8 rounded-full bg-blue-500 text-white border-2 border-neutral-950 flex items-center justify-center shadow-lg"
            title="Verified Creator Profile"
          >
            <VerifiedBadgeIcon className="w-5 h-5 text-white" />
          </div>
        </div>

        {/* Profile Name */}
        <div className="mt-3 flex items-center justify-center gap-1.5">
          <h1 className="text-2xl sm:text-3xl font-extrabold font-display tracking-tight text-white">
            {profile.name}
          </h1>
        </div>

        {/* Handle Button with Quick Copy */}
        <button
          onClick={handleCopyHandle}
          className="mt-1 inline-flex items-center gap-1.5 text-sm font-medium text-neutral-400 hover:text-indigo-400 transition-colors"
          title="Click to copy handle"
        >
          <span>{profile.handle}</span>
          {copiedHandle ? (
            <Check className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <Copy className="w-3 h-3 text-neutral-500" />
          )}
        </button>

        {/* Bio description */}
        <p className="mt-2 text-sm sm:text-base text-neutral-300 max-w-md font-normal leading-relaxed">
          {profile.bio}
        </p>

        {/* Clean unboxed metadata separator (Zero-Pill Discipline §1.A) */}
        <div className="mt-3 flex items-center justify-center flex-wrap gap-2 text-xs text-neutral-400 font-medium">
          <span>Digital Creator</span>
          <span aria-hidden="true">·</span>
          <span>Official Social Channels</span>
          <span aria-hidden="true">·</span>
          <span className="text-emerald-400">Verified</span>
        </div>
      </div>
    </header>
  );
}
