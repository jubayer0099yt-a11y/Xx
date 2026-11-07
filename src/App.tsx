/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { BIO_LINKS, PROFILE_DATA } from './data/links';
import { ThemePreset } from './types';
import { Header } from './components/Header';
import { QuickSocialStrip } from './components/QuickSocialStrip';
import { CategoryFilter } from './components/CategoryFilter';
import { LinkCard } from './components/LinkCard';
import { ContactCard } from './components/ContactCard';
import { Footer } from './components/Footer';
import { ShareModal } from './components/ShareModal';
import { Toast } from './components/Toast';

export default function App() {
  // Theme state
  const [theme, setTheme] = useState<ThemePreset>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('jubayer_theme') as ThemePreset | null;
      if (saved && ['obsidian', 'midnight', 'emerald', 'light'].includes(saved)) {
        return saved;
      }
    }
    return 'obsidian';
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
    // Default initial clicks
    const initial: Record<string, number> = {};
    BIO_LINKS.forEach((l) => {
      initial[l.id] = l.defaultClicks;
    });
    return initial;
  });

  // Search & category filter states
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals & Toast states
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Sync theme to localStorage and html tag
  useEffect(() => {
    localStorage.setItem('jubayer_theme', theme);
    const root = document.documentElement;
    if (theme === 'light') {
      root.classList.remove('dark');
    } else {
      root.classList.add('dark');
    }
  }, [theme]);

  // Sync sound preference
  const toggleSound = () => {
    setSoundEnabled((prev) => {
      const next = !prev;
      localStorage.setItem('jubayer_sound_enabled', String(next));
      return next;
    });
  };

  // Toast handler
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((current) => (current === msg ? null : current));
    }, 2800);
  };

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

  // Theme-specific background and accent styles
  const themeClasses = useMemo(() => {
    switch (theme) {
      case 'midnight':
        return {
          wrapper: 'bg-slate-950 text-slate-100',
          radialGlow1: 'from-cyan-500/10 via-sky-600/5 to-transparent',
          radialGlow2: 'from-blue-600/10 via-indigo-600/5 to-transparent',
        };
      case 'emerald':
        return {
          wrapper: 'bg-zinc-950 text-zinc-100',
          radialGlow1: 'from-emerald-500/10 via-teal-600/5 to-transparent',
          radialGlow2: 'from-green-600/10 via-emerald-800/5 to-transparent',
        };
      case 'light':
        return {
          wrapper: 'bg-neutral-100 text-neutral-900',
          radialGlow1: 'from-indigo-200/40 via-purple-100/30 to-transparent',
          radialGlow2: 'from-sky-200/40 via-neutral-100 to-transparent',
        };
      case 'obsidian':
      default:
        return {
          wrapper: 'bg-neutral-950 text-neutral-100',
          radialGlow1: 'from-indigo-600/15 via-purple-600/5 to-transparent',
          radialGlow2: 'from-blue-600/10 via-indigo-900/5 to-transparent',
        };
    }
  }, [theme]);

  return (
    <div className={`min-h-screen relative overflow-x-hidden transition-colors duration-300 ${themeClasses.wrapper}`}>
      {/* Ambient background glow layers */}
      <div
        className={`fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-gradient-radial ${themeClasses.radialGlow1} blur-3xl pointer-events-none -z-10`}
      />
      <div
        className={`fixed bottom-0 right-0 w-[600px] h-[500px] bg-gradient-radial ${themeClasses.radialGlow2} blur-3xl pointer-events-none -z-10`}
      />

      {/* Main Content Container */}
      <main className="w-full max-w-2xl mx-auto px-4 pb-16 flex flex-col items-center">
        {/* Profile Header */}
        <Header
          profile={PROFILE_DATA}
          soundEnabled={soundEnabled}
          onToggleSound={toggleSound}
          onOpenShareModal={() => setIsShareModalOpen(true)}
          onShowToast={showToast}
          currentTheme={theme}
          onSelectTheme={setTheme}
        />

        {/* Quick Circular Social Icons Strip */}
        <div className="w-full mt-4">
          <QuickSocialStrip
            links={BIO_LINKS}
            onLinkClick={handleLinkClick}
            soundEnabled={soundEnabled}
          />
        </div>

        {/* Search & Category Filter */}
        <div className="w-full mt-4">
          <CategoryFilter
            activeCategory={activeCategory}
            onSelectCategory={setActiveCategory}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            soundEnabled={soundEnabled}
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
              />
            ))
          ) : (
            <div className="w-full py-12 text-center text-neutral-400 bg-neutral-900/30 rounded-2xl border border-neutral-800">
              <p className="text-sm font-medium">No links matching "{searchQuery}"</p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setActiveCategory('all');
                }}
                className="mt-2 text-xs text-indigo-400 hover:text-indigo-300 font-medium"
              >
                Reset filters
              </button>
            </div>
          )}
        </section>

        {/* Direct Email / Inquiries Card */}
        <ContactCard
          email={PROFILE_DATA.email}
          onShowToast={showToast}
          soundEnabled={soundEnabled}
        />

        {/* Footer */}
        <Footer
          copyright={PROFILE_DATA.copyright}
          onOpenShareModal={() => setIsShareModalOpen(true)}
          soundEnabled={soundEnabled}
        />
      </main>

      {/* Share & QR Code Modal */}
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        soundEnabled={soundEnabled}
        onShowToast={showToast}
      />

      {/* Toast Notification */}
      <Toast message={toastMessage} />
    </div>
  );
}
