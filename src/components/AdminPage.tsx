import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Calendar,
  Check,
  CheckCheck,
  Clock,
  Copy,
  Eye,
  EyeOff,
  Inbox,
  KeyRound,
  Loader2,
  LogOut,
  Mail,
  MailOpen,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  User as UserIcon,
} from 'lucide-react';
import { Language, TRANSLATIONS } from '../data/i18n';
import { ThemeConfig } from '../data/themes';
import { PROFILE_DATA } from '../data/links';
import { playCopySound, playTapSound } from '../utils/sound';

interface AdminPageProps {
  lang: Language;
  onSelectLanguage: (lang: Language) => void;
  soundEnabled: boolean;
  themeConfig: ThemeConfig;
  onNavigateHome: () => void;
}

export interface AdminMessageRecord {
  id: string;
  name: string;
  email: string;
  message: string;
  status: 'unread' | 'read';
  deliveredVia?: 'email' | 'saved';
  createdAt: string;
  updatedAt: string | null;
}

type InboxFilter = 'all' | 'unread' | 'read';

function formatDateAndTime(
  isoDate: string | null | undefined,
  lang: Language
): { date: string; time: string } {
  if (!isoDate) {
    return { date: '—', time: '—' };
  }
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) {
    return { date: '—', time: '—' };
  }
  const locale = lang === 'bn' ? 'bn-BD' : 'en-US';
  return {
    date: d.toLocaleDateString(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }),
    time: d.toLocaleTimeString(locale, {
      hour: '2-digit',
      minute: '2-digit',
    }),
  };
}

export function AdminPage({
  lang,
  onSelectLanguage,
  soundEnabled,
  themeConfig,
  onNavigateHome,
}: AdminPageProps) {
  const t = TRANSLATIONS[lang];
  const isLight = Boolean(themeConfig.isLight);

  const [statusLoading, setStatusLoading] = useState(true);
  const [isConfigured, setIsConfigured] = useState(true);
  const [apiUnreachable, setApiUnreachable] = useState(false);

  // Server-verified HttpOnly cookie session state (no token kept in JS or browser storage)
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminUsername, setAdminUsername] = useState<string | null>(null);

  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmittingAuth, setIsSubmittingAuth] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [messages, setMessages] = useState<AdminMessageRecord[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [filter, setFilter] = useState<InboxFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [busyMessageId, setBusyMessageId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Check server configuration status & existing HttpOnly session cookie on mount
  useEffect(() => {
    let active = true;
    async function bootstrapSession() {
      try {
        const [statusRes, sessionRes] = await Promise.all([
          fetch('/api/admin/status', { credentials: 'include', cache: 'no-store' }),
          fetch('/api/admin/session', { credentials: 'include', cache: 'no-store' }),
        ]);

        const statusType = statusRes.headers.get('content-type') || '';
        if (!statusType.includes('application/json')) {
          if (active) {
            setApiUnreachable(true);
            setAuthError(t.adminApiUnreachable);
          }
          return;
        }

        const statusData = await statusRes.json().catch(() => null);
        if (!statusRes.ok || !statusData || typeof statusData?.configured !== 'boolean') {
          if (active) {
            if (typeof statusData?.error === 'string' && statusData.error.length > 0) {
              setApiUnreachable(false);
              setAuthError(statusData.error);
            } else {
              setApiUnreachable(true);
              setAuthError(t.adminApiUnreachable);
            }
          }
          return;
        }

        if (active) {
          setApiUnreachable(false);
          setIsConfigured(statusData.configured || statusData.missingSessionSecret);
          if (statusData.invalidHashConfig) {
            setAuthError(t.adminInvalidHashConfig);
          } else if (statusData.missingSessionSecret) {
            setAuthError(
              lang === 'bn'
                ? 'Vercel Environment Variables-এ ADMIN_USERNAME, ADMIN_PASSWORD এবং ADMIN_SESSION_SECRET (১৬+ অক্ষর) সেট করে Redeploy করুন।'
                : 'Set ADMIN_USERNAME, ADMIN_PASSWORD, and ADMIN_SESSION_SECRET (16+ chars) in Vercel Environment Variables and redeploy.'
            );
          }
        }

        const sessionType = sessionRes.headers.get('content-type') || '';
        if (sessionRes.ok && sessionType.includes('application/json')) {
          const sessionData = await sessionRes.json().catch(() => ({}));
          if (active && sessionData?.ok && sessionData?.authenticated) {
            setIsAuthenticated(true);
            setAdminUsername(
              typeof sessionData.username === 'string' ? sessionData.username : 'admin'
            );
          }
        }
      } catch {
        if (active) {
          setApiUnreachable(true);
          setAuthError(t.adminApiUnreachable);
        }
      } finally {
        if (active) setStatusLoading(false);
      }
    }
    void bootstrapSession();
    return () => {
      active = false;
    };
  }, [lang, t.adminApiUnreachable, t.adminInvalidHashConfig]);

  const clearSession = useCallback((errorMsg?: string) => {
    setIsAuthenticated(false);
    setAdminUsername(null);
    setMessages([]);
    setConfirmDeleteId(null);
    if (errorMsg) {
      setAuthError(errorMsg);
    }
  }, []);

  const fetchMessages = useCallback(async () => {
    setIsLoadingMessages(true);
    setActionError(null);
    try {
      const res = await fetch('/api/admin/messages', {
        credentials: 'include',
        cache: 'no-store',
      });
      if (res.status === 401) {
        clearSession(
          lang === 'bn'
            ? 'সেশন শেষ হয়ে গেছে। অনুগ্রহ করে আবার লগইন করুন।'
            : 'Session expired. Please sign in again.'
        );
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok || !Array.isArray(data?.messages)) {
        setActionError(
          typeof data?.error === 'string' ? data.error : 'Failed to load messages.'
        );
        return;
      }
      setMessages(data.messages);
    } catch {
      setActionError(
        lang === 'bn'
          ? 'সার্ভার থেকে মেসেজ লোড করা যায়নি।'
          : 'Unable to fetch messages from the server.'
      );
    } finally {
      setIsLoadingMessages(false);
    }
  }, [clearSession, lang]);

  useEffect(() => {
    if (!isAuthenticated) return;
    void fetchMessages();
  }, [isAuthenticated, fetchMessages]);

  const handleAuthSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    playTapSound(soundEnabled);
    setAuthError(null);

    if (apiUnreachable) {
      setAuthError(t.adminApiUnreachable);
      return;
    }

    const cleanUsername = usernameInput.trim();
    if (!cleanUsername || !passwordInput) {
      setAuthError(t.adminErrRequired);
      return;
    }

    const endpoint = isConfigured ? '/api/admin/login' : '/api/admin/setup';
    setIsSubmittingAuth(true);
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        body: JSON.stringify({
          username: cleanUsername,
          password: passwordInput,
        }),
      });

      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        setApiUnreachable(true);
        setAuthError(t.adminApiUnreachable);
        return;
      }

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data?.ok) {
        if (res.status === 403 && !isConfigured) {
          setIsConfigured(true);
        }
        if (res.status === 412 || data?.code === 'NOT_CONFIGURED') {
          setIsConfigured(false);
        }
        if (data?.code === 'INVALID_HASH_CONFIG') {
          setAuthError(t.adminInvalidHashConfig);
          return;
        }
        if (res.status === 401) {
          setAuthError(
            lang === 'bn'
              ? 'ভুল Username বা Password দেওয়া হয়েছে।'
              : typeof data?.error === 'string' && data.error.length > 0
                ? data.error
                : 'Invalid username or password.'
          );
          return;
        }
        const errMsg =
          typeof data?.error === 'string' && data.error.length > 0
            ? data.error
            : t.adminApiUnreachable;
        setAuthError(errMsg);
        return;
      }

      // Verify HttpOnly session cookie round-trip cleanly with /api/admin/session
      const sessionVerifyRes = await fetch('/api/admin/session', {
        credentials: 'include',
        cache: 'no-store',
      });
      if (!sessionVerifyRes.ok) {
        setAuthError(
          lang === 'bn'
            ? 'সেশন কুকি সংরক্ষণ করা যায়নি। অনুগ্রহ করে HTTPS বা কুকি অনুমোদিত ব্রাউজারে চেষ্টা করুন।'
            : 'Session cookie was rejected by browser. Ensure cookies are enabled and try again.'
        );
        return;
      }

      setApiUnreachable(false);
      setIsConfigured(true);
      setIsAuthenticated(true);
      setAdminUsername(typeof data.username === 'string' ? data.username : cleanUsername);
      setPasswordInput('');
      playCopySound(soundEnabled);
    } catch {
      setAuthError(
        lang === 'bn'
          ? 'সার্ভারের সাথে সংযোগ স্থাপন করা যায়নি। আবার চেষ্টা করুন।'
          : 'Unable to reach authentication server. Please try again.'
      );
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  const handleSignOut = async () => {
    playTapSound(soundEnabled);
    clearSession();
    setPasswordInput('');
    try {
      await fetch('/api/admin/logout', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
        },
      });
    } catch {
      // Ignore network errors on logout cleanup
    }
  };

  const handleToggleStatus = async (msg: AdminMessageRecord) => {
    if (!isAuthenticated) return;
    playTapSound(soundEnabled);
    setBusyMessageId(msg.id);
    setActionError(null);
    const nextStatus = msg.status === 'read' ? 'unread' : 'read';

    try {
      const res = await fetch(`/api/admin/messages/${encodeURIComponent(msg.id)}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        body: JSON.stringify({ status: nextStatus }),
      });

      if (res.status === 401) {
        clearSession();
        return;
      }

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok || !data?.message) {
        setActionError(
          typeof data?.error === 'string' ? data.error : 'Could not update message status.'
        );
        return;
      }

      setMessages((prev) =>
        prev.map((item) => (item.id === msg.id ? data.message : item))
      );
    } catch {
      setActionError(
        lang === 'bn'
          ? 'মেসেজের অবস্থা পরিবর্তন করা যায়নি।'
          : 'Failed to update message status.'
      );
    } finally {
      setBusyMessageId(null);
    }
  };

  const handleDeleteMessage = async (msgId: string) => {
    if (!isAuthenticated) return;
    playTapSound(soundEnabled);
    setBusyMessageId(msgId);
    setActionError(null);

    try {
      const res = await fetch(`/api/admin/messages/${encodeURIComponent(msgId)}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
        },
      });

      if (res.status === 401) {
        clearSession();
        return;
      }

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        setActionError(
          typeof data?.error === 'string' ? data.error : 'Could not delete message.'
        );
        return;
      }

      setMessages((prev) => prev.filter((item) => item.id !== msgId));
      setConfirmDeleteId(null);
    } catch {
      setActionError(
        lang === 'bn'
          ? 'মেসেজ ডিলিট করা যায়নি।'
          : 'Failed to delete message.'
      );
    } finally {
      setBusyMessageId(null);
    }
  };

  const handleCopyText = async (value: string, key: string) => {
    try {
      await navigator.clipboard.writeText(value);
      playCopySound(soundEnabled);
      setCopiedId(key);
      setTimeout(() => setCopiedId((prev) => (prev === key ? null : prev)), 1800);
    } catch {
      // Ignore clipboard failure
    }
  };

  const stats = useMemo(() => {
    const unread = messages.filter((m) => m.status === 'unread').length;
    return {
      total: messages.length,
      unread,
      read: messages.length - unread,
    };
  }, [messages]);

  const filteredMessages = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return messages.filter((m) => {
      if (filter !== 'all' && m.status !== filter) return false;
      if (!q) return true;
      return (
        m.name.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        m.message.toLowerCase().includes(q)
      );
    });
  }, [messages, filter, searchQuery]);

  const cardSurface = isLight
    ? 'bg-white/95 border-slate-200/90 text-slate-900 shadow-lg shadow-slate-900/5'
    : 'bg-[#071128]/90 border-amber-400/25 text-white shadow-[0_18px_48px_rgba(3,9,24,0.65)]';

  const inputSurface = isLight
    ? 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:ring-amber-500/20'
    : 'bg-[#050d20]/85 border-white/15 text-white placeholder:text-slate-400 focus:border-amber-400 focus:ring-amber-400/20';

  return (
    <div className="min-h-screen w-full max-w-3xl mx-auto px-4 py-6 sm:py-8">
      {/* Top Admin Header Bar */}
      <header className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <button
          type="button"
          onClick={() => {
            playTapSound(soundEnabled);
            onNavigateHome();
          }}
          className={`h-9 px-3 rounded-xl border flex items-center gap-2 text-xs font-semibold transition-all active:scale-95 ${
            isLight
              ? 'bg-white hover:bg-slate-100 text-slate-800 border-slate-200'
              : 'bg-[#071128]/90 hover:bg-[#0d1c3f] text-slate-100 border-amber-400/25'
          }`}
        >
          <ArrowLeft className="w-3.5 h-3.5 text-amber-400" />
          <span>{t.adminBackHome}</span>
        </button>

        <div className="flex items-center gap-2">
          {/* Language Switcher */}
          <div
            className={`h-9 p-0.5 rounded-xl border flex items-center ${
              isLight
                ? 'bg-slate-100 border-slate-200'
                : 'bg-[#071128]/90 border-amber-400/20'
            }`}
          >
            <button
              type="button"
              onClick={() => {
                playTapSound(soundEnabled);
                onSelectLanguage('bn');
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                lang === 'bn'
                  ? 'bg-amber-400 text-[#060d1f]'
                  : isLight
                    ? 'text-slate-600'
                    : 'text-slate-300'
              }`}
            >
              বাংলা
            </button>
            <button
              type="button"
              onClick={() => {
                playTapSound(soundEnabled);
                onSelectLanguage('en');
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                lang === 'en'
                  ? 'bg-amber-400 text-[#060d1f]'
                  : isLight
                    ? 'text-slate-600'
                    : 'text-slate-300'
              }`}
            >
              English
            </button>
          </div>

          {isAuthenticated && (
            <button
              type="button"
              onClick={handleSignOut}
              className={`h-9 px-3 rounded-xl border flex items-center gap-1.5 text-xs font-semibold transition-colors ${
                isLight
                  ? 'bg-white hover:bg-red-50 text-red-600 border-slate-200'
                  : 'bg-[#071128]/90 hover:bg-red-500/15 text-red-300 border-red-400/30'
              }`}
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>{t.adminSignOut}</span>
            </button>
          )}
        </div>
      </header>

      {/* Initial Status Check */}
      {statusLoading ? (
        <div
          className={`rounded-3xl border backdrop-blur-xl p-10 flex flex-col items-center justify-center gap-3 ${cardSurface}`}
        >
          <Loader2 className="w-7 h-7 animate-spin text-amber-400" />
          <p className="text-xs text-slate-400">{t.adminSubtitle}</p>
        </div>
      ) : !isAuthenticated ? (
        /* Username & Password Admin Login (or First-Run Setup when unconfigured) */
        <div
          className={`rounded-3xl border backdrop-blur-xl p-6 sm:p-8 max-w-md mx-auto space-y-5 relative overflow-hidden ${cardSurface}`}
        >
          <div className="absolute top-0 left-10 right-10 h-[1.5px] bg-gradient-to-r from-transparent via-amber-400/70 to-transparent" />

          <div className="text-center space-y-3">
            <div className="w-16 h-16 rounded-full mx-auto p-0.5 bg-gradient-to-tr from-amber-400 to-amber-600 shadow-lg">
              <img
                src={PROFILE_DATA.avatarUrl}
                alt="JUBAYER"
                className="w-full h-full rounded-full object-cover object-top bg-[#060d1f]"
              />
            </div>

            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/15 border border-amber-400/30 text-amber-300 text-[11px] font-semibold">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>JUBAYER PRIVATE ADMIN</span>
              </div>
              <h1 className="font-display text-xl sm:text-2xl font-bold pt-1">
                {isConfigured ? t.adminSignInTitle : t.adminSetupTitle}
              </h1>
              <p
                className={`text-xs sm:text-sm ${
                  isLight ? 'text-slate-600' : 'text-slate-300/85'
                }`}
              >
                {isConfigured ? t.adminSignInDesc : t.adminSetupDesc}
              </p>
            </div>
          </div>

          <form onSubmit={handleAuthSubmit} noValidate className="space-y-4">
            <div>
              <label
                htmlFor="admin-username"
                className={`block text-xs font-medium mb-1.5 ${
                  isLight ? 'text-slate-700' : 'text-slate-200'
                }`}
              >
                {t.adminUsernameLabel}
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="admin-username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  value={usernameInput}
                  onChange={(e) => {
                    setUsernameInput(e.target.value);
                    if (authError) setAuthError(null);
                  }}
                  placeholder={t.adminUsernamePlaceholder}
                  className={`w-full pl-10 pr-3.5 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 transition-all ${inputSurface}`}
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="admin-password"
                className={`block text-xs font-medium mb-1.5 ${
                  isLight ? 'text-slate-700' : 'text-slate-200'
                }`}
              >
                {t.adminPasswordLabel}
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="admin-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={isConfigured ? 'current-password' : 'new-password'}
                  value={passwordInput}
                  onChange={(e) => {
                    setPasswordInput(e.target.value);
                    if (authError) setAuthError(null);
                  }}
                  placeholder={t.adminPasswordPlaceholder}
                  className={`w-full pl-10 pr-10 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 transition-all ${inputSurface}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-amber-400 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {authError && (
              <p
                role="alert"
                className={`text-xs rounded-xl px-3.5 py-2.5 border ${
                  isLight
                    ? 'text-red-700 bg-red-50 border-red-200'
                    : 'text-red-300 bg-red-500/15 border-red-400/35'
                }`}
              >
                {authError}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmittingAuth}
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400 hover:from-amber-300 hover:to-amber-400 text-[#060d1f] shadow-[0_8px_24px_rgba(245,158,11,0.3)] disabled:opacity-65 transition-all active:scale-[0.99]"
            >
              {isSubmittingAuth ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{isConfigured ? t.adminSigningIn : t.adminSettingUp}</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>{isConfigured ? t.adminSignInBtn : t.adminSetupBtn}</span>
                </>
              )}
            </button>
          </form>
        </div>
      ) : (
        /* Authenticated Admin Inbox Dashboard */
        <div className="space-y-5">
          <div
            className={`rounded-3xl border backdrop-blur-xl p-5 sm:p-6 relative overflow-hidden ${cardSurface}`}
          >
            <div className="absolute top-0 left-8 right-8 h-[1.5px] bg-gradient-to-r from-transparent via-amber-400/70 to-transparent" />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-amber-400/15 border border-amber-400/35 text-amber-400 flex items-center justify-center shrink-0">
                  <Inbox className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="font-display text-xl sm:text-2xl font-bold">
                    {t.adminTitle}
                  </h1>
                  <p
                    className={`text-xs ${
                      isLight ? 'text-slate-600' : 'text-slate-300/80'
                    }`}
                  >
                    {t.adminSubtitle}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div
                  className={`px-3 py-1.5 rounded-xl border text-left ${
                    isLight
                      ? 'bg-slate-50 border-slate-200 text-slate-700'
                      : 'bg-[#050d20]/85 border-amber-400/25 text-amber-200'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider opacity-80">
                    <ShieldCheck className="w-3 h-3 text-emerald-400" />
                    <span>{t.adminSessionBadge}</span>
                  </div>
                  <div className="font-mono text-xs font-semibold mt-0.5">
                    @{adminUsername || 'admin'}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    playTapSound(soundEnabled);
                    if (isAuthenticated) void fetchMessages();
                  }}
                  disabled={isLoadingMessages}
                  title={t.adminRefresh}
                  aria-label={t.adminRefresh}
                  className={`h-11 w-11 rounded-xl border flex items-center justify-center transition-colors disabled:opacity-50 ${
                    isLight
                      ? 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700'
                      : 'bg-[#050d20]/85 hover:bg-[#0a1838] border-amber-400/25 text-amber-300'
                  }`}
                >
                  <RefreshCw className={`w-4 h-4 ${isLoadingMessages ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {actionError && (
              <div
                role="alert"
                className={`mt-4 text-xs rounded-xl px-3.5 py-2.5 border ${
                  isLight
                    ? 'bg-red-50 border-red-200 text-red-700'
                    : 'bg-red-500/15 border-red-400/35 text-red-300'
                }`}
              >
                {actionError}
              </div>
            )}

            {/* Summary Counters */}
            <div className="grid grid-cols-3 gap-3 mt-5">
              <div
                className={`rounded-2xl p-3 border ${
                  isLight
                    ? 'bg-slate-50 border-slate-200'
                    : 'bg-[#050d20]/75 border-white/10'
                }`}
              >
                <div className="text-[11px] opacity-75">{t.adminTotal}</div>
                <div className="font-display text-xl font-bold mt-0.5">
                  {stats.total}
                </div>
              </div>
              <div
                className={`rounded-2xl p-3 border ${
                  isLight
                    ? 'bg-amber-50 border-amber-200 text-amber-900'
                    : 'bg-amber-400/10 border-amber-400/30 text-amber-200'
                }`}
              >
                <div className="text-[11px] opacity-80">{t.adminUnread}</div>
                <div className="font-display text-xl font-bold mt-0.5">
                  {stats.unread}
                </div>
              </div>
              <div
                className={`rounded-2xl p-3 border ${
                  isLight
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-emerald-500/10 border-emerald-400/25 text-emerald-200'
                }`}
              >
                <div className="text-[11px] opacity-80">{t.adminRead}</div>
                <div className="font-display text-xl font-bold mt-0.5">
                  {stats.read}
                </div>
              </div>
            </div>

            {/* Filter Tabs & Search */}
            <div className="mt-4 flex flex-col sm:flex-row gap-3">
              <div
                className={`p-1 rounded-xl border flex items-center gap-1 shrink-0 ${
                  isLight
                    ? 'bg-slate-100 border-slate-200'
                    : 'bg-[#050d20]/85 border-white/10'
                }`}
              >
                {(['all', 'unread', 'read'] as InboxFilter[]).map((key) => {
                  const label =
                    key === 'all'
                      ? t.adminFilterAll
                      : key === 'unread'
                        ? t.adminFilterUnread
                        : t.adminFilterRead;
                  const active = filter === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        playTapSound(soundEnabled);
                        setFilter(key);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        active
                          ? 'bg-amber-400 text-[#060d1f] shadow-sm'
                          : isLight
                            ? 'text-slate-600 hover:text-slate-900'
                            : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>

              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t.adminSearchPlaceholder}
                  className={`w-full pl-9 pr-3 py-2 rounded-xl border text-xs sm:text-sm outline-none focus:ring-2 transition-all ${inputSurface}`}
                />
              </div>
            </div>
          </div>

          {/* Messages List */}
          {isLoadingMessages && messages.length === 0 ? (
            <div
              className={`rounded-3xl border p-10 flex flex-col items-center justify-center gap-3 ${cardSurface}`}
            >
              <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
            </div>
          ) : filteredMessages.length === 0 ? (
            <div
              className={`rounded-3xl border p-10 text-center space-y-2 ${cardSurface}`}
            >
              <Inbox className="w-9 h-9 text-amber-400/75 mx-auto" />
              <h2 className="font-display text-base font-semibold">
                {t.adminEmptyTitle}
              </h2>
              <p
                className={`text-xs ${
                  isLight ? 'text-slate-500' : 'text-slate-400'
                }`}
              >
                {t.adminEmptyDesc}
              </p>
            </div>
          ) : (
            <div className="space-y-3.5">
              {filteredMessages.map((msg) => {
                const { date, time } = formatDateAndTime(msg.createdAt, lang);
                const isUnread = msg.status === 'unread';
                const isBusy = busyMessageId === msg.id;

                return (
                  <article
                    key={msg.id}
                    className={`rounded-2xl border p-4 sm:p-5 transition-all ${
                      isLight
                        ? isUnread
                          ? 'bg-amber-50/45 border-amber-300 shadow-md'
                          : 'bg-white/95 border-slate-200 shadow-sm'
                        : isUnread
                          ? 'bg-[#091736]/95 border-amber-400/45 shadow-[0_10px_30px_rgba(245,158,11,0.12)]'
                          : 'bg-[#071128]/85 border-white/12'
                    }`}
                  >
                    {/* Sender Header Row */}
                    <div className="flex flex-wrap items-start justify-between gap-2.5">
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-display text-base font-bold truncate">
                            {msg.name}
                          </h3>
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                              isUnread
                                ? 'bg-amber-400/20 text-amber-300 border border-amber-400/35'
                                : isLight
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : 'bg-emerald-500/15 text-emerald-300 border border-emerald-400/25'
                            }`}
                          >
                            {isUnread ? t.adminUnread : t.adminRead}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap text-xs">
                          <a
                            href={`mailto:${encodeURIComponent(msg.email)}`}
                            className={`inline-flex items-center gap-1 hover:underline ${
                              isLight ? 'text-blue-600' : 'text-amber-300'
                            }`}
                          >
                            <Mail className="w-3 h-3 shrink-0" />
                            <span>{msg.email}</span>
                          </a>
                          <button
                            type="button"
                            onClick={() => handleCopyText(msg.email, `email-${msg.id}`)}
                            aria-label="Copy sender email"
                            className="p-1 rounded-md hover:bg-white/10 opacity-75 hover:opacity-100"
                          >
                            {copiedId === `email-${msg.id}` ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Date & Time */}
                      <div
                        className={`flex items-center gap-3 text-[11px] font-mono ${
                          isLight ? 'text-slate-500' : 'text-slate-400'
                        }`}
                      >
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-amber-400/80" />
                          <span>{date}</span>
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Clock className="w-3 h-3 text-amber-400/80" />
                          <span>{time}</span>
                        </span>
                      </div>
                    </div>

                    {/* Message Body */}
                    <p
                      className={`mt-3 text-sm leading-relaxed whitespace-pre-wrap break-words rounded-xl p-3.5 border ${
                        isLight
                          ? 'bg-slate-50 border-slate-200/80 text-slate-800'
                          : 'bg-[#050d20]/75 border-white/8 text-slate-200'
                      }`}
                    >
                      {msg.message}
                    </p>

                    {/* Action Controls: Read / Unread / Delete */}
                    <div className="mt-3.5 flex flex-wrap items-center justify-end gap-2">
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => handleToggleStatus(msg)}
                        className={`px-3 py-1.5 rounded-xl border text-xs font-semibold inline-flex items-center gap-1.5 transition-all disabled:opacity-50 ${
                          isUnread
                            ? 'bg-amber-400 hover:bg-amber-300 text-[#060d1f] border-amber-400'
                            : isLight
                              ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                              : 'bg-white/8 hover:bg-white/15 text-slate-200 border-white/15'
                        }`}
                      >
                        {isUnread ? (
                          <>
                            <CheckCheck className="w-3.5 h-3.5" />
                            <span>{t.adminMarkRead}</span>
                          </>
                        ) : (
                          <>
                            <MailOpen className="w-3.5 h-3.5" />
                            <span>{t.adminMarkUnread}</span>
                          </>
                        )}
                      </button>

                      {confirmDeleteId === msg.id ? (
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleDeleteMessage(msg.id)}
                            className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors disabled:opacity-50"
                          >
                            {isBusy ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                            <span>{t.adminConfirmDelete}</span>
                          </button>
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => setConfirmDeleteId(null)}
                            className={`px-2.5 py-1.5 rounded-xl border text-xs font-medium ${
                              isLight
                                ? 'bg-white text-slate-600 border-slate-200'
                                : 'bg-white/5 text-slate-300 border-white/15'
                            }`}
                          >
                            {t.adminCancel}
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => {
                            playTapSound(soundEnabled);
                            setConfirmDeleteId(msg.id);
                          }}
                          className={`px-3 py-1.5 rounded-xl border text-xs font-semibold inline-flex items-center gap-1.5 transition-colors disabled:opacity-50 ${
                            isLight
                              ? 'bg-white hover:bg-red-50 text-red-600 border-red-200'
                              : 'bg-red-500/10 hover:bg-red-500/20 text-red-300 border-red-400/30'
                          }`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>{t.adminDelete}</span>
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
