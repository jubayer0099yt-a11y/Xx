export interface BioLink {
  id: string;
  title: string;
  subtitle: string;
  url: string;
  platform: 'youtube' | 'tiktok' | 'facebook' | 'instagram' | 'whatsapp' | 'telegram' | 'email';
  category: 'all' | 'video' | 'social' | 'chat';
  featured?: boolean;
  highlightText?: string;
  defaultClicks: number;
}

export type ThemePreset = 'signature' | 'cyan' | 'emerald' | 'purple' | 'amber' | 'light';

export interface ProfileData {
  name: string;
  handle: string;
  bio: string;
  verified: boolean;
  avatarUrl: string;
  coverUrl: string;
  email: string;
  copyright: string;
}
