import React, { useState, useRef, useEffect } from 'react';
import { Share2, Volume2, VolumeX, Copy, Check, Palette } from 'lucide-react';
import { ProfileData, ThemePreset } from '../types';
import { ThemeConfig, THEME_CONFIGS } from '../data/themes';
import { Language, TRANSLATIONS } from '../data/i18n';
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
  themeConfig: ThemeConfig;
  lang: Language;
  onSelectLanguage: (lang: Language) => void;
}

export function Header({
  profile,
  soundEnabled,
  onToggleSound,
  onOpenShareModal,
  onShowToast,
  currentTheme,
  onSelectTheme,
  themeConfig,
  lang,
  onSelectLanguage,
}: HeaderProps) {
  const [copiedHandle, setCopiedHandle] = useState(false);
  const [coverError, setCoverError] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isColorMenuOpen, setIsColorMenuOpen] = useState(false);
  const colorMenuRef = useRef<HTMLDivElement | null>(null);

  const t = TRANSLATIONS[lang];
  const isLight = themeConfig.isLight;

  // Close color popover on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (colorMenuRef.current && !colorMenuRef.current.contains(event.target as Node)) {
        setIsColorMenuOpen(false);
      }
    }
    if (isColorMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isColorMenuOpen]);

  const handleCopyHandle = async () => {
    try {
      await navigator.clipboard.writeText(profile.handle);
      setCopiedHandle(true);
      playCopySound(soundEnabled);
      setTimeout(() => setCopiedHandle(false), 1800);
    } catch {
      // Ignore copy error
    }
  };

  const handleThemeChange = (newTheme: ThemePreset) => {
    playTapSound(soundEnabled);
    onSelectTheme(newTheme);
    const targetConfig = THEME_CONFIGS[newTheme];
    onShowToast(t.toastThemeChanged(targetConfig ? targetConfig.name : newTheme));
  };

  return (
    <header className="relative w-full">
      {/* Top utility row */}
      <div className="w-full max-w-2xl mx-auto px-4 pt-4 pb-2 flex items-center justify-between gap-3 z-30 relative">
        <div className="flex items-center gap-2">
          <span
            className={`font-display font-bold text-sm tracking-wide ${
              isLight ? 'text-slate-900' : 'text-white'
            }`}
          >
            {t.appTitle}
          </span>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Full Language Switcher: [ বাংলা | English ] */}
          <div
            className={`h-8 sm:h-9 p-0.5 rounded-xl border flex items-center shadow-sm ${
              isLight
                ? 'bg-slate-100/90 border-slate-200'
                : 'bg-neutral-900/90 border-neutral-800'
            }`}
            role="group"
            aria-label="Language selection"
          >
            <button
              type="button"
              onClick={() => {
                playTapSound(soundEnabled);
                onSelectLanguage('bn');
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all duration-150 ${
                lang === 'bn'
                  ? `${themeConfig.accentBg} ${themeConfig.accentText} font-bold shadow-sm`
                  : isLight
                    ? 'text-slate-600 hover:text-slate-900'
                    : 'text-neutral-400 hover:text-white'
              }`}
              title="বাংলা ভাষা নির্বাচন করুন"
            >
              বাংলা
            </button>
            <button
              type="button"
              onClick={() => {
                playTapSound(soundEnabled);
                onSelectLanguage('en');
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all duration-150 ${
                lang === 'en'
                  ? `${themeConfig.accentBg} ${themeConfig.accentText} font-bold shadow-sm`
                  : isLight
                    ? 'text-slate-600 hover:text-slate-900'
                    : 'text-neutral-400 hover:text-white'
              }`}
              title="Select English language"
            >
              English
            </button>
          </div>

          {/* Single Color Theme Icon Button with Popup Menu */}
          <div className="relative" ref={colorMenuRef}>
            <button
              type="button"
              onClick={() => {
                playTapSound(soundEnabled);
                setIsColorMenuOpen(!isColorMenuOpen);
              }}
              aria-label={t.changeColor}
              title={t.changeColor}
              className={`h-8 sm:h-9 px-2 sm:px-2.5 rounded-xl border flex items-center gap-1.5 transition-all active:scale-95 ${
                isColorMenuOpen
                  ? `${themeConfig.accentBg} shadow-md`
                  : isLight
                    ? 'bg-white hover:bg-slate-100 text-slate-800 border-slate-200 shadow-sm'
                    : 'bg-neutral-900/90 hover:bg-neutral-800 text-neutral-200 border-neutral-800 shadow-sm'
              }`}
            >
              <Palette className="w-3.5 h-3.5" />
              <span
                className="w-2.5 h-2.5 rounded-full ring-1 ring-white/60 shadow-sm"
                style={{ backgroundColor: themeConfig.badgeDot }}
              />
            </button>

            {/* Horizontal Color Options - Pure Colors Only, No Text Names */}
            {isColorMenuOpen && (
              <div
                className={`absolute right-0 top-full mt-2 p-1.5 rounded-2xl border shadow-2xl backdrop-blur-2xl z-50 flex items-center gap-1.5 animate-in fade-in zoom-in-95 duration-150 ${
                  isLight
                    ? 'bg-white/95 border-slate-200 shadow-slate-400/30'
                    : 'bg-neutral-950/95 border-neutral-800 shadow-black/90'
                }`}
              >
                {Object.keys(THEME_CONFIGS).map((key) => {
                  const cfg = THEME_CONFIGS[key];
                  const isSelected = currentTheme === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        handleThemeChange(key as ThemePreset);
                        setIsColorMenuOpen(false);
                      }}
                      aria-label={`Color ${key}`}
                      className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center transition-all active:scale-90 ${
                        isSelected
                          ? 'ring-2 ring-white scale-110 bg-white/20 shadow-sm'
                          : 'hover:scale-105 opacity-80 hover:opacity-100'
                      }`}
                    >
                      <span
                        className={`w-4 h-4 sm:w-4.5 sm:h-4.5 rounded-full bg-gradient-to-tr ${cfg.swatchGradient} ring-1 ring-black/40 shadow-inner`}
                      />
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Sound Toggle */}
          <button
            onClick={onToggleSound}
            aria-label={soundEnabled ? 'Mute tap audio' : 'Enable tap audio'}
            title={soundEnabled ? 'Mute audio feedback' : 'Enable audio feedback'}
            className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl border flex items-center justify-center transition-colors ${
              isLight
                ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                : 'bg-neutral-900/80 hover:bg-neutral-800 text-neutral-300 hover:text-white border-neutral-800'
            }`}
          >
            {soundEnabled ? (
              <Volume2 className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${themeConfig.accentText}`} />
            ) : (
              <VolumeX className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-neutral-500" />
            )}
          </button>

          {/* Share Profile Button */}
          <button
            onClick={() => {
              playTapSound(soundEnabled);
              onOpenShareModal();
            }}
            aria-label={t.share}
            title={t.share}
            className={`h-8 sm:h-9 px-2.5 sm:px-3 rounded-xl border flex items-center gap-1.5 text-xs font-medium transition-colors ${
              isLight
                ? 'bg-white hover:bg-slate-100 text-slate-800 border-slate-200'
                : 'bg-neutral-900/80 hover:bg-neutral-800 text-neutral-200 hover:text-white border-neutral-800'
            }`}
          >
            <Share2 className={`w-3.5 h-3.5 ${themeConfig.accentText}`} />
            <span className="hidden xs:inline">{t.share}</span>
          </button>
        </div>
      </div>

      {/* Cover Banner with stylized background using the artwork */}
      <div className="w-full max-w-2xl mx-auto px-4 pt-1">
        <div className="relative h-44 sm:h-52 w-full rounded-3xl overflow-hidden border border-neutral-800/80 shadow-2xl bg-neutral-950 flex items-center justify-center">
          {/* Blurred wide ambient version of the artwork */}
          <img
            src={profile.coverUrl}
            alt="Jubayer Ambient Backdrop"
            referrerPolicy="no-referrer"
            onError={() => setCoverError(true)}
            className="absolute inset-0 w-full h-full object-cover object-center scale-150 filter blur-xl brightness-50 opacity-60"
          />

          {/* Dynamic Theme Banner Gradient Split matching active color */}
          <div
            className={`absolute inset-0 bg-gradient-to-r ${themeConfig.bannerGradient} pointer-events-none transition-all duration-500`}
          />

          {/* Character motif in banner background */}
          <div className="relative z-10 flex items-center justify-center opacity-85 hover:opacity-100 transition-opacity">
            <div
              className={`w-24 h-24 sm:w-28 sm:h-28 rounded-full p-1 bg-gradient-to-tr ${themeConfig.avatarRing} shadow-2xl transition-all duration-500`}
            >
              <img
                src={profile.coverUrl}
                alt="Jubayer Profile Art"
                referrerPolicy="no-referrer"
                className="w-full h-full rounded-full object-cover filter brightness-95"
              />
            </div>
          </div>

          {/* Vignette Scrim overlay for depth */}
          <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/40 to-black/20 pointer-events-none" />
        </div>
      </div>

      {/* Profile Avatar & Identity Lockup right above @JUBAYER */}
      <div className="w-full max-w-2xl mx-auto px-4 -mt-16 sm:-mt-20 relative z-10 flex flex-col items-center text-center">
        {/* Avatar with verified badge */}
        <div className="relative group cursor-pointer" onClick={handleCopyHandle}>
          <div
            className={`w-28 h-28 sm:w-32 sm:h-32 rounded-full p-1 bg-gradient-to-tr ${themeConfig.avatarRing} shadow-2xl ring-4 ring-neutral-950 transition-all duration-500`}
          >
            <div className="w-full h-full rounded-full overflow-hidden bg-neutral-950 border-2 border-neutral-900 relative flex items-center justify-center">
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
            title={t.tagVerified}
          >
            <VerifiedBadgeIcon className="w-5 h-5 text-white" />
          </div>
        </div>

        {/* Profile Name */}
        <div className="mt-3 flex items-center justify-center gap-1.5">
          <h1
            className={`text-2xl sm:text-3xl font-extrabold font-display tracking-tight ${
              isLight ? 'text-slate-900' : 'text-white'
            }`}
          >
            {profile.name}
          </h1>
        </div>

        {/* Handle Button with Quick Copy */}
        <button
          onClick={handleCopyHandle}
          className={`mt-1 inline-flex items-center gap-1.5 text-sm font-medium transition-colors ${
            isLight ? 'text-slate-600 hover:text-blue-600' : 'text-neutral-400 hover:text-white'
          }`}
          title={t.copyHandle}
        >
          <span>{profile.handle}</span>
          {copiedHandle ? (
            <Check className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <Copy className="w-3 h-3 text-neutral-500" />
          )}
        </button>

        {/* Bio description in active language */}
        <p
          className={`mt-2.5 text-sm sm:text-base max-w-md font-normal leading-relaxed whitespace-pre-line px-2 ${
            isLight ? 'text-slate-700' : 'text-neutral-300'
          }`}
        >
          {t.bio}
        </p>
      </div>
    </header>
  );
}
