import React, { useState } from 'react';
import { ExternalLink, Copy, Check, Sparkles, Mail } from 'lucide-react';
import { BioLink } from '../types';
import { ThemeConfig } from '../data/themes';
import { Language, TRANSLATIONS } from '../data/i18n';
import { YouTubeIcon, TikTokIcon, FacebookIcon, InstagramIcon, WhatsAppIcon, TelegramIcon } from './Icons';
import { playCopySound, playTapSound } from '../utils/sound';

interface LinkCardProps {
  link: BioLink;
  clicks: number;
  onLinkClick: (id: string, url: string) => void;
  onShowToast: (msg: string) => void;
  soundEnabled: boolean;
  themeConfig: ThemeConfig;
  lang?: Language;
}

export function LinkCard({
  link,
  clicks,
  onLinkClick,
  onShowToast,
  soundEnabled,
  themeConfig,
  lang = 'en',
}: LinkCardProps) {
  const [copied, setCopied] = useState(false);
  const t = TRANSLATIONS[lang];

  const handleCopyLink = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(link.url);
      setCopied(true);
      playCopySound(soundEnabled);
      onShowToast(t.toastCopiedLink(link.title));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      onShowToast('Could not copy link');
    }
  };

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    playTapSound(soundEnabled);
    onLinkClick(link.id, link.url);
  };

  // Subtitle in active language
  const getSubtitle = () => {
    switch (link.platform) {
      case 'youtube':
        return t.youtubeSub;
      case 'tiktok':
        return t.tiktokSub;
      case 'facebook':
        return t.facebookSub;
      case 'instagram':
        return t.instagramSub;
      case 'whatsapp':
        return t.whatsappSub;
      case 'telegram':
        return t.telegramSub;
      case 'email':
        return t.emailSub;
      default:
        return link.subtitle;
    }
  };

  // Clicks in active language
  const formatClicks = (num: number) => {
    const formatted = num.toLocaleString();
    if (lang !== 'bn') return `${formatted} ${t.clicks}`;
    const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    return `${formatted.replace(/[0-9]/g, (d) => bnDigits[Number(d)])} ${t.clicks}`;
  };

  // Platform specific icon & styling
  const renderPlatformIcon = () => {
    switch (link.platform) {
      case 'youtube':
        return (
          <div className="w-11 h-11 rounded-2xl bg-red-600/15 text-red-500 border border-red-500/25 flex items-center justify-center shrink-0 group-hover:scale-105 group-hover:bg-red-600 group-hover:text-white transition-all duration-200">
            <YouTubeIcon className="w-6 h-6" />
          </div>
        );
      case 'tiktok':
        return (
          <div className="w-11 h-11 rounded-2xl bg-neutral-900 text-neutral-100 border border-neutral-700/60 flex items-center justify-center shrink-0 group-hover:scale-105 group-hover:border-cyan-400/50 group-hover:shadow-[0_0_15px_rgba(34,211,238,0.3)] transition-all duration-200">
            <TikTokIcon className="w-5 h-5 text-cyan-400 group-hover:text-white transition-colors" />
          </div>
        );
      case 'facebook':
        return (
          <div className="w-11 h-11 rounded-2xl bg-blue-600/15 text-blue-400 border border-blue-500/25 flex items-center justify-center shrink-0 group-hover:scale-105 group-hover:bg-blue-600 group-hover:text-white transition-all duration-200">
            <FacebookIcon className="w-5 h-5" />
          </div>
        );
      case 'instagram':
        return (
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-purple-500/20 via-pink-500/20 to-orange-500/20 text-pink-400 border border-pink-500/25 flex items-center justify-center shrink-0 group-hover:scale-105 group-hover:from-purple-600 group-hover:via-pink-600 group-hover:to-orange-500 group-hover:text-white transition-all duration-200">
            <InstagramIcon className="w-5 h-5" />
          </div>
        );
      case 'whatsapp':
        return (
          <div className="w-11 h-11 rounded-2xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 flex items-center justify-center shrink-0 group-hover:scale-105 group-hover:bg-emerald-500 group-hover:text-white transition-all duration-200">
            <WhatsAppIcon className="w-5 h-5" />
          </div>
        );
      case 'telegram':
        return (
          <div className="w-11 h-11 rounded-2xl bg-sky-500/15 text-sky-400 border border-sky-500/25 flex items-center justify-center shrink-0 group-hover:scale-105 group-hover:bg-sky-500 group-hover:text-white transition-all duration-200">
            <TelegramIcon className="w-5 h-5" />
          </div>
        );
      case 'email':
        return (
          <div className="w-11 h-11 rounded-2xl bg-amber-500/15 text-amber-400 border border-amber-500/25 flex items-center justify-center shrink-0 group-hover:scale-105 group-hover:bg-amber-500 group-hover:text-slate-950 transition-all duration-200">
            <Mail className="w-5 h-5" />
          </div>
        );
      default:
        return (
          <div className="w-11 h-11 rounded-2xl bg-neutral-800 text-neutral-300 flex items-center justify-center shrink-0">
            <ExternalLink className="w-5 h-5" />
          </div>
        );
    }
  };

  const isLight = themeConfig.isLight;

  return (
    <div className="relative group">
      <a
        href={link.url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleClick}
        className={`w-full min-h-[68px] p-3.5 sm:p-4 rounded-2xl flex items-center justify-between gap-3 text-left transition-all duration-200 block border backdrop-blur-md ${
          themeConfig.cardBg
        } ${
          link.featured
            ? `${themeConfig.cardBorder} ${themeConfig.cardHoverBorder} shadow-lg ring-1 ring-inset ${themeConfig.accentBorder}`
            : `${themeConfig.cardBorder} ${themeConfig.cardHoverBorder}`
        } active:scale-[0.985]`}
        aria-label={`Open ${link.title}: ${getSubtitle()}`}
      >
        {/* Left: Icon & Title/Subtitle */}
        <div className="flex items-center gap-3.5 min-w-0 flex-1">
          {renderPlatformIcon()}

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3
                className={`text-base font-semibold transition-colors truncate ${
                  isLight ? 'text-slate-900 group-hover:text-black' : 'text-neutral-100 group-hover:text-white'
                }`}
              >
                {link.title}
              </h3>
              {link.featured && (
                <span className={`text-[11px] font-medium flex items-center gap-1 ${themeConfig.accentText}`}>
                  <Sparkles className="w-3 h-3" />
                  <span className="hidden xs:inline">{t.featuredTag}</span>
                </span>
              )}
            </div>
            <p
              className={`text-xs truncate mt-0.5 transition-colors ${
                isLight ? 'text-slate-500 group-hover:text-slate-700' : 'text-neutral-400 group-hover:text-neutral-300'
              }`}
            >
              {getSubtitle()}
            </p>
          </div>
        </div>

        {/* Right: Metrics & Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <span
            className={`text-[11px] font-mono tabular-nums hidden sm:inline-block pr-1 ${
              isLight ? 'text-slate-400' : 'text-neutral-500'
            }`}
          >
            {formatClicks(clicks)}
          </span>

          {/* Quick copy link button */}
          <button
            type="button"
            onClick={handleCopyLink}
            aria-label={`Copy link for ${link.title}`}
            title={`Copy ${link.title} URL`}
            className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all opacity-80 group-hover:opacity-100 ${
              isLight
                ? 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                : 'bg-neutral-800/80 hover:bg-neutral-700 text-neutral-400 hover:text-white'
            }`}
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          {/* External jump arrow */}
          <div
            className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${
              isLight
                ? 'bg-slate-100 group-hover:bg-slate-200 text-slate-600'
                : 'bg-neutral-800/50 group-hover:bg-neutral-700 text-neutral-400 group-hover:text-white'
            }`}
          >
            <ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </div>
        </div>
      </a>
    </div>
  );
}
