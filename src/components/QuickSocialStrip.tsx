import React from 'react';
import { BioLink } from '../types';
import { YouTubeIcon, TikTokIcon, FacebookIcon, InstagramIcon, WhatsAppIcon, TelegramIcon } from './Icons';
import { playTapSound } from '../utils/sound';

interface QuickSocialStripProps {
  links: BioLink[];
  onLinkClick: (id: string, url: string) => void;
  soundEnabled: boolean;
}

export function QuickSocialStrip({ links, onLinkClick, soundEnabled }: QuickSocialStripProps) {
  const getIcon = (platform: BioLink['platform']) => {
    switch (platform) {
      case 'youtube':
        return <YouTubeIcon className="w-5 h-5 text-red-500 group-hover:text-white" />;
      case 'tiktok':
        return <TikTokIcon className="w-4 h-4 text-cyan-400 group-hover:text-white" />;
      case 'facebook':
        return <FacebookIcon className="w-4 h-4 text-blue-400 group-hover:text-white" />;
      case 'instagram':
        return <InstagramIcon className="w-4 h-4 text-pink-400 group-hover:text-white" />;
      case 'whatsapp':
        return <WhatsAppIcon className="w-4 h-4 text-emerald-400 group-hover:text-white" />;
      case 'telegram':
        return <TelegramIcon className="w-4 h-4 text-sky-400 group-hover:text-white" />;
      default:
        return null;
    }
  };

  const getHoverBg = (platform: BioLink['platform']) => {
    switch (platform) {
      case 'youtube':
        return 'hover:bg-red-600 hover:border-red-500';
      case 'tiktok':
        return 'hover:bg-neutral-800 hover:border-cyan-400';
      case 'facebook':
        return 'hover:bg-blue-600 hover:border-blue-500';
      case 'instagram':
        return 'hover:bg-gradient-to-tr hover:from-purple-600 hover:via-pink-600 hover:to-orange-500 hover:border-pink-500';
      case 'whatsapp':
        return 'hover:bg-emerald-600 hover:border-emerald-500';
      case 'telegram':
        return 'hover:bg-sky-500 hover:border-sky-400';
      default:
        return 'hover:bg-neutral-700';
    }
  };

  // Only take social & messaging platforms (exclude generic email for this icon strip)
  const socialLinks = links.filter((l) => l.platform !== 'email');

  return (
    <div className="w-full flex items-center justify-center gap-2.5 sm:gap-3 py-3" aria-label="Quick social shortcuts">
      {socialLinks.map((link) => {
        const hoverClass = getHoverBg(link.platform);
        return (
          <a
            key={link.id}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => {
              playTapSound(soundEnabled);
              onLinkClick(link.id, link.url);
            }}
            className={`w-11 h-11 rounded-2xl bg-neutral-900/90 border border-neutral-800 text-neutral-300 flex items-center justify-center transition-all duration-200 group active:scale-95 shadow-md ${hoverClass}`}
            aria-label={`Open ${link.title}`}
            title={link.title}
          >
            {getIcon(link.platform)}
          </a>
        );
      })}
    </div>
  );
}
