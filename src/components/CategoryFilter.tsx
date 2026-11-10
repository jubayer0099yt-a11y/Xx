import React from 'react';
import { Search } from 'lucide-react';
import { ThemeConfig } from '../data/themes';
import { playTapSound } from '../utils/sound';

interface CategoryFilterProps {
  activeCategory: string;
  onSelectCategory: (cat: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  soundEnabled: boolean;
  themeConfig: ThemeConfig;
}

export function CategoryFilter({
  activeCategory,
  onSelectCategory,
  searchQuery,
  onSearchChange,
  soundEnabled,
  themeConfig,
}: CategoryFilterProps) {
  const categories = [
    { id: 'all', label: 'All Links' },
    { id: 'video', label: 'Video & Edits' },
    { id: 'social', label: 'Socials' },
    { id: 'chat', label: 'Direct Chat' },
  ];

  const isLight = themeConfig.isLight;

  return (
    <div className="w-full space-y-3 mb-4">
      {/* Search Input */}
      <div className="relative">
        <div className={`absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none ${
          isLight ? 'text-slate-400' : 'text-neutral-500'
        }`}>
          <Search className="w-4 h-4" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Filter channels or search links..."
          className={`w-full h-11 pl-10 pr-4 rounded-xl border text-sm transition-all outline-none ${
            isLight
              ? 'bg-white/90 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-sm'
              : `bg-neutral-900/70 ${themeConfig.cardBorder} ${themeConfig.textColor} placeholder-neutral-500 focus:outline-none focus:${themeConfig.accentBorder} focus:ring-1 focus:${themeConfig.accentBorder}`
          }`}
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange('')}
            className={`absolute inset-y-0 right-0 pr-3.5 flex items-center text-xs ${
              isLight ? 'text-slate-400 hover:text-slate-700' : 'text-neutral-400 hover:text-white'
            }`}
          >
            Clear
          </button>
        )}
      </div>

      {/* Segmented Filter Buttons */}
      <div className={`flex items-center gap-1.5 p-1 rounded-xl border overflow-x-auto no-scrollbar ${
        isLight
          ? 'bg-slate-100/90 border-slate-200'
          : `bg-neutral-900/80 ${themeConfig.cardBorder}`
      }`}>
        {categories.map((cat) => {
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => {
                playTapSound(soundEnabled);
                onSelectCategory(cat.id);
              }}
              className={`flex-1 min-w-[76px] py-1.5 px-2.5 text-xs font-medium rounded-lg transition-all text-center whitespace-nowrap shrink-0 ${
                isActive
                  ? isLight
                    ? 'bg-white text-slate-900 shadow-sm border border-slate-200 font-semibold'
                    : `${themeConfig.accentBg} shadow-md border ${themeConfig.accentBorder}`
                  : isLight
                    ? 'text-slate-500 hover:text-slate-800'
                    : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              {cat.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
