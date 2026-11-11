/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { BIO_LINKS, PROFILE_DATA } from './data/links';
import { ThemePreset } from './types';
import { THEME_CONFIGS } from './data/themes';
import { Language } from './data/i18n';
import { Header } from './components/Header';
import { QuickSocialStrip } from './components/QuickSocialStrip';
import { LinkCard } from './components/LinkCard';
import { Footer } from './components/Footer';
import { ShareModal } from './components/ShareModal';

export default function App() {
  // Theme state with fallback to 'signature'
  const [theme, setTheme] = useState<ThemePreset>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('jubayer_theme') as ThemePreset | null;
      if (saved && Object.keys(THEME_CONFIGS).includes(saved)) {
        return saved;
      }
    }
    return 'signature';
  });

  // Language state (Bangla or English)
  const [lang, setLang] = useState<Language>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('jubayer_lang') as Language | null;
      if (saved === 'en' || saved === 'bn') {
        return saved;
      }
    }
    return 'bn'; // Default to Bengali as requested
  });

  // Sound preference state
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('jubayer_sound_enabled');
      return saved !== null ? saved === 'true' : true;
    }
    return true;
  });

  // Click counts state
  const [clicks, setClicks] = useState<Record<string, number>>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('jubayer_link_clicks');
        if (saved) return JSON.parse(saved);
      } catch {
        // Fallback
      }
    }
    const initial: Record<string, number> = {};
    BIO_LINKS.forEach((l) => {
      initial[l.id] = l.defaultClicks;
    });
    return initial;
  });

  // Modals state
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  // Active theme configuration
  const themeConfig = useMemo(() => {
    return THEME_CONFIGS[theme] || THEME_CONFIGS.signature;
  }, [theme]);

  // Sync theme to localStorage and html tag
  useEffect(() => {
    localStorage.setItem('jubayer_theme', theme);
    const root = document.documentElement;
    if (themeConfig.isLight) {
      root.classList.remove('dark');
    } else {
      root.classList.add('dark');
    }
  }, [theme, themeConfig]);

  // Sync language to localStorage
  useEffect(() => {
    localStorage.setItem('jubayer_lang', lang);
  }, [lang]);

  // Sound preference toggle
  const toggleSound = () => {
    setSoundEnabled((prev) => {
      const next = !prev;
      localStorage.setItem('jubayer_sound_enabled', String(next));
      return next;
    });
  };

  // Language selection handler
  const handleSelectLanguage = (newLang: Language) => {
    setLang(newLang);
  };

  // Silent handler (all popups disabled as requested)
  const showToast = (_msg: string) => {};

  // Click counter handler
  const handleLinkClick = (id: string, url: string) => {
    setClicks((prev) => {
      const updated = {
        ...prev,
        [id]: (prev[id] || 0) + 1,
      };
      try {
        localStorage.setItem('jubayer_link_clicks', JSON.stringify(updated));
      } catch {
        // Ignore storage errors
      }
      return updated;
    });
  };



  return (
    <div
      style={themeConfig.bgStyle}
      className={`min-h-screen relative overflow-x-hidden transition-all duration-500 ${
        themeConfig.textColor
      }`}
    >
      {/* Ambient background using the user's artwork with theme-reactive glow */}
      <div className="fixed inset-0 pointer-events-none -z-20 overflow-hidden">
        <img
          src={PROFILE_DATA.avatarUrl}
          alt=""
          aria-hidden="true"
          className="w-full h-full object-cover object-top scale-125 filter blur-3xl opacity-15 dark:opacity-15"
        />
        <div
          className="absolute inset-0 transition-colors duration-500"
          style={{
            backgroundColor: themeConfig.isLight ? 'rgba(255, 255, 255, 0.75)' : 'rgba(10, 10, 15, 0.75)',
          }}
        />
      </div>

      {/* Dynamic Ambient Gradient Spheres */}
      <div
        style={{
          background: `radial-gradient(circle, ${themeConfig.glowColor1} 0%, transparent 70%)`,
        }}
        className="fixed top-0 left-1/2 -translate-x-1/2 w-[900px] h-[550px] blur-3xl pointer-events-none -z-10 transition-all duration-500"
      />
      <div
        style={{
          background: `radial-gradient(circle, ${themeConfig.glowColor2} 0%, transparent 70%)`,
        }}
        className="fixed bottom-0 right-0 w-[650px] h-[550px] blur-3xl pointer-events-none -z-10 transition-all duration-500"
      />

      {/* Main Content Container */}
      <main className="w-full max-w-2xl mx-auto px-4 pb-16 flex flex-col items-center">
        {/* Profile Header with Color Switcher and Language Toggle */}
        <Header
          profile={PROFILE_DATA}
          soundEnabled={soundEnabled}
          onToggleSound={toggleSound}
          onOpenShareModal={() => setIsShareModalOpen(true)}
          onShowToast={showToast}
          currentTheme={theme}
          onSelectTheme={setTheme}
          themeConfig={themeConfig}
          lang={lang}
          onSelectLanguage={handleSelectLanguage}
        />

        {/* Quick Circular Social Icons Strip right below Profile Header */}
        <div className="w-full mt-3">
          <QuickSocialStrip
            links={BIO_LINKS}
            onLinkClick={handleLinkClick}
            soundEnabled={soundEnabled}
          />
        </div>

        {/* Bio Link Cards Feed */}
        <section className="w-full space-y-3 mt-4" aria-label="Official Links">
          {BIO_LINKS.map((link) => (
            <LinkCard
              key={link.id}
              link={link}
              clicks={clicks[link.id] || link.defaultClicks}
              onLinkClick={handleLinkClick}
              onShowToast={showToast}
              soundEnabled={soundEnabled}
              themeConfig={themeConfig}
              lang={lang}
            />
          ))}
        </section>

        {/* Footer */}
        <Footer
          copyright={PROFILE_DATA.copyright}
          onOpenShareModal={() => setIsShareModalOpen(true)}
          soundEnabled={soundEnabled}
          themeConfig={themeConfig}
          lang={lang}
        />
      </main>

      {/* Share Modal */}
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        soundEnabled={soundEnabled}
        onShowToast={showToast}
        lang={lang}
      />
    </div>
  );
}
