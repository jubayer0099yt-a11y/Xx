import React, { useState, useEffect } from 'react';
import { Play, Video, Edit3, X, Check, ExternalLink, Sparkles } from 'lucide-react';
import { ThemeConfig } from '../data/themes';
import { Language, TRANSLATIONS } from '../data/i18n';
import { playTapSound, playCopySound } from '../utils/sound';

interface FeaturedVideoProps {
  themeConfig: ThemeConfig;
  lang: Language;
  soundEnabled: boolean;
  onShowToast: (msg: string) => void;
}

export function FeaturedVideo({
  themeConfig,
  lang,
  soundEnabled,
  onShowToast,
}: FeaturedVideoProps) {
  const t = TRANSLATIONS[lang];
  const isLight = themeConfig.isLight;

  // Default featured video URL (Viral Master BD / Gaming showcase)
  const DEFAULT_VIDEO = 'https://www.youtube.com/watch?v=k3_tw44QsZQ';

  const [videoUrl, setVideoUrl] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('jubayer_featured_video');
      if (saved && saved.trim()) return saved;
    }
    return DEFAULT_VIDEO;
  });

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [inputUrl, setInputUrl] = useState(videoUrl);
  const [errorMsg, setErrorMsg] = useState('');

  // Parser for YouTube & Facebook Embeds
  const getEmbedInfo = (url: string): { type: 'youtube' | 'facebook' | 'iframe'; embedUrl: string } | null => {
    if (!url) return null;
    const cleanUrl = url.trim();

    // YouTube Shorts: https://www.youtube.com/shorts/VIDEO_ID
    const ytShortsMatch = cleanUrl.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]+)/i);
    if (ytShortsMatch) {
      return {
        type: 'youtube',
        embedUrl: `https://www.youtube-nocookie.com/embed/${ytShortsMatch[1]}?autoplay=0&rel=0`,
      };
    }

    // YouTube watch: https://www.youtube.com/watch?v=VIDEO_ID
    const ytWatchMatch = cleanUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]+)/i);
    if (ytWatchMatch) {
      return {
        type: 'youtube',
        embedUrl: `https://www.youtube-nocookie.com/embed/${ytWatchMatch[1]}?autoplay=0&rel=0`,
      };
    }

    // Facebook Video / Reel
    if (cleanUrl.includes('facebook.com') || cleanUrl.includes('fb.watch')) {
      const fbEmbed = `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(
        cleanUrl
      )}&show_text=false&t=0`;
      return {
        type: 'facebook',
        embedUrl: fbEmbed,
      };
    }

    // Generic iframe if already an embed link
    if (cleanUrl.startsWith('https://')) {
      return {
        type: 'iframe',
        embedUrl: cleanUrl,
      };
    }

    return null;
  };

  const embedData = getEmbedInfo(videoUrl);

  const handleSaveVideo = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const trimmed = inputUrl.trim();

    if (!trimmed) {
      setErrorMsg(t.invalidVideoUrl);
      return;
    }

    const testEmbed = getEmbedInfo(trimmed);
    if (!testEmbed) {
      setErrorMsg(t.invalidVideoUrl);
      return;
    }

    setVideoUrl(trimmed);
    localStorage.setItem('jubayer_featured_video', trimmed);
    setIsEditModalOpen(false);
    playCopySound(soundEnabled);
    onShowToast(t.videoUpdatedSuccess);
  };

  return (
    <section className="w-full mt-3" aria-label={t.featuredVideo}>
      <div
        className={`w-full rounded-2xl border p-3.5 sm:p-4 backdrop-blur-md shadow-xl transition-all ${
          isLight
            ? 'bg-white/95 border-slate-200 shadow-slate-200/60'
            : `${themeConfig.cardBg} ${themeConfig.cardBorder} shadow-black/60`
        }`}
      >
        {/* Section Header */}
        <div className="flex items-center justify-between gap-3 mb-2.5">
          <div className="flex items-center gap-2">
            <div
              className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 border ${
                isLight
                  ? 'bg-red-50 text-red-600 border-red-200'
                  : 'bg-red-600/15 text-red-400 border-red-500/30'
              }`}
            >
              <Video className="w-4 h-4" />
            </div>
            <div>
              <h2
                className={`text-sm font-bold font-display flex items-center gap-1.5 ${
                  isLight ? 'text-slate-900' : 'text-white'
                }`}
              >
                <span>{t.featuredVideo}</span>
                <span className={`text-[10px] font-semibold ${themeConfig.accentText} flex items-center gap-0.5`}>
                  <Sparkles className="w-3 h-3" />
                  <span>Latest</span>
                </span>
              </h2>
            </div>
          </div>

          {/* Change Video Link Button */}
          <button
            type="button"
            onClick={() => {
              playTapSound(soundEnabled);
              setInputUrl(videoUrl);
              setErrorMsg('');
              setIsEditModalOpen(true);
            }}
            className={`h-7 px-2.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-all active:scale-95 ${
              isLight
                ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white border-neutral-700/60'
            }`}
            title={t.changeVideo}
          >
            <Edit3 className="w-3 h-3" />
            <span className="hidden xs:inline">{t.changeVideo}</span>
          </button>
        </div>

        {/* 16:9 Video Player Container */}
        <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black border border-neutral-800/80 shadow-inner group">
          {embedData ? (
            <iframe
              src={embedData.embedUrl}
              title={t.featuredVideo}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              className="w-full h-full border-0"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-center p-4 bg-neutral-900 text-neutral-400">
              <Play className="w-10 h-10 mb-2 opacity-50" />
              <p className="text-xs">{t.invalidVideoUrl}</p>
            </div>
          )}
        </div>
      </div>

      {/* Edit Video Link Modal */}
      {isEditModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-150"
          onClick={() => setIsEditModalOpen(false)}
        >
          <div
            className={`w-full max-w-md rounded-2xl border p-5 shadow-2xl relative text-left ${
              isLight
                ? 'bg-white border-slate-200 text-slate-900'
                : 'bg-neutral-900 border-neutral-800 text-neutral-100'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800/60">
              <div className="flex items-center gap-2">
                <Video className="w-4 h-4 text-red-500" />
                <h3 className="text-base font-bold font-display">{t.videoModalTitle}</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="w-8 h-8 rounded-lg bg-neutral-800/60 hover:bg-neutral-700 text-neutral-300 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveVideo} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1">
                  {t.videoModalDesc}
                </label>
                <input
                  type="url"
                  value={inputUrl}
                  onChange={(e) => {
                    setInputUrl(e.target.value);
                    setErrorMsg('');
                  }}
                  placeholder={t.videoPlaceholder}
                  className={`w-full h-11 px-3.5 rounded-xl border text-xs font-mono outline-none transition-all ${
                    isLight
                      ? 'bg-slate-50 border-slate-300 text-slate-900 focus:border-blue-500'
                      : 'bg-neutral-950 border-neutral-700 text-neutral-100 focus:border-red-500'
                  }`}
                  autoFocus
                />
                <p className="text-[11px] text-neutral-400 mt-1">
                  💡 {t.videoEmbedHint}
                </p>
                {errorMsg && (
                  <p className="text-xs text-rose-500 font-medium mt-1.5">{errorMsg}</p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className={`h-9 px-3.5 rounded-xl text-xs font-medium border ${
                    isLight
                      ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                      : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border-neutral-700'
                  }`}
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className={`h-9 px-4 rounded-xl text-xs font-medium flex items-center gap-1.5 shadow-md ${themeConfig.accentBg}`}
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{t.saveVideo}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
