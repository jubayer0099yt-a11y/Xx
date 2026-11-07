import React from 'react';
import { Search } from 'lucide-react';
import { playTapSound } from '../utils/sound';

interface CategoryFilterProps {
  activeCategory: string;
  onSelectCategory: (cat: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  soundEnabled: boolean;
}

export function CategoryFilter({
  activeCategory,
  onSelectCategory,
  searchQuery,
  onSearchChange,
  soundEnabled,
}: CategoryFilterProps) {
  const categories = [
    { id: 'all', label: 'All Links' },
    { id: 'video', label: 'Video & Edits' },
    { id: 'social', label: 'Socials' },
    { id: 'chat', label: 'Direct Chat' },
  ];

  return (
    <div className="w-full space-y-3 mb-4">
      {/* Search Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-500">
          <Search className="w-4 h-4" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Filter channels or search links..."
          className="w-full h-11 pl-10 pr-4 rounded-xl bg-neutral-900/60 border border-neutral-800/80 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-indigo-500/60 focus:bg-neutral-900/90 transition-all"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-xs text-neutral-400 hover:text-white"
          >
            Clear
          </button>
        )}
      </div>

      {/* Segmented Filter Buttons (interactive controls permitted per §1.A) */}
      <div className="flex items-center gap-1.5 p-1 bg-neutral-900/70 border border-neutral-800/80 rounded-xl overflow-x-auto no-scrollbar">
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
                  ? 'bg-neutral-800 text-white shadow-sm border border-neutral-700/60'
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
