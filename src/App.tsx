/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { BIO_LINKS, PROFILE_DATA } from './data/links';
import { ThemePreset } from './types';
import { THEME_CONFIGS } from './data/themes';
import { Language, TRANSLATIONS } from './data/i18n';
import { Header } from './components/Header';
import { QuickSocialStrip } from './components/QuickSocialStrip';
import { FeaturedVideo } from './components/FeaturedVideo';
import { CategoryFilter } from './components/CategoryFilter';
import { LinkCard } from './components/LinkCard';
import { ContactCard } from './components/ContactCard';
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

  // Search & category filter states
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals state
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  // Active theme configuration
  const themeConfig = useMemo(() => {
    return THEME_CONFIGS[theme] || THEME_CONFIGS.signature;
  }, [theme]);

  const t = TRANSLATIONS[lang];

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

  // Language toggle handler
  const handleToggleLanguage = () => {
    const nextLang: Language = lang === 'en' ? 'bn' : 'en';
    setLang(nextLang);
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

  // Filtered links
  const filteredLinks = useMemo(() => {
    return BIO_LINKS.filter((link) => {
      // Category filter
      if (activeCategory !== 'all') {
        if (activeCategory === 'video' && link.category !== 'video') return false;
        if (activeCategory === 'social' && link.category !== 'social') return false;
        if (activeCategory === 'chat' && link.category !== 'chat') return false;
      }
      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = link.title.toLowerCase().includes(query);
        const matchesSub = link.subtitle.toLowerCase().includes(query);
        const matchesPlatform = link.platform.toLowerCase().includes(query);
        if (!matchesTitle && !matchesSub && !matchesPlatform) return false;
      }
      return true;
    });
  }, [activeCategory, searchQuery]);

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
          onToggleLanguage={handleToggleLanguage}
        />

        {/* Quick Circular Social Icons Strip right below Profile Header */}
        <div className="w-full mt-3">
          <QuickSocialStrip
            links={BIO_LINKS}
            onLinkClick={handleLinkClick}
            soundEnabled={soundEnabled}
          />
        </div>

        {/* FEATURE 1: Featured Video Player (YouTube & Facebook Reels) */}
        <FeaturedVideo
          themeConfig={themeConfig}
          lang={lang}
          soundEnabled={soundEnabled}
          onShowToast={showToast}
        />

        {/* Search & Category Filter */}
        <div className="w-full mt-3">
          <CategoryFilter
            activeCategory={activeCategory}
            onSelectCategory={setActiveCategory}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            soundEnabled={soundEnabled}
            themeConfig={themeConfig}
            lang={lang}
          />
        </div>

        {/* Bio Link Cards Feed */}
        <section className="w-full space-y-3 mt-1" aria-label="Official Links">
          {filteredLinks.length > 0 ? (
            filteredLinks.map((link) => (
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
            ))
          ) : (
            <div
              className={`w-full py-12 text-center rounded-2xl border ${
                themeConfig.isLight
                  ? 'bg-white/80 border-slate-200 text-slate-600'
                  : 'bg-neutral-900/40 border-neutral-800 text-neutral-400'
              }`}
            >
              <p className="text-sm font-medium">
                {t.noLinksFound} "{searchQuery}"
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setActiveCategory('all');
                }}
                className={`mt-2 text-xs font-semibold ${themeConfig.accentText}`}
              >
                {t.resetFilters}
              </button>
            </div>
          )}
        </section>

        {/* Direct Email / Inquiries Card */}
        <ContactCard
          email={PROFILE_DATA.email}
          onShowToast={showToast}
          soundEnabled={soundEnabled}
          themeConfig={themeConfig}
          lang={lang}
        />

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
