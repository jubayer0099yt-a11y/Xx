import React, { useEffect, useMemo, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import {
  ArrowLeft,
  Calendar,
  Check,
  CheckCheck,
  Clock,
  Copy,
  Inbox,
  Loader2,
  LogOut,
  Mail,
  MailOpen,
  Search,
  ShieldCheck,
  ShieldX,
  Trash2,
} from 'lucide-react';
import {
  ADMIN_EMAIL,
  auth,
  ContactMessageRecord,
  db,
  googleProvider,
  handleFirestoreError,
  OperationType,
} from '../firebase';
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

type InboxFilter = 'all' | 'unread' | 'read';

function formatDateAndTime(
  ts: ContactMessageRecord['createdAt'],
  lang: Language
): { date: string; time: string } {
  if (!ts || typeof ts.toDate !== 'function') {
    return { date: '—', time: '—' };
  }
  const d = ts.toDate();
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

  const [authReady, setAuthReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isAdminVerified, setIsAdminVerified] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [messages, setMessages] = useState<ContactMessageRecord[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [filter, setFilter] = useState<InboxFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [busyMessageId, setBusyMessageId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Listen to Firebase Auth state & verify Admin identity + UID record
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setAuthError(null);

      if (!currentUser) {
        setIsAdminVerified(false);
        setMessages([]);
        setAuthReady(true);
        return;
      }

      const emailMatches =
        Boolean(currentUser.emailVerified) &&
        currentUser.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();

      if (!emailMatches) {
        setIsAdminVerified(false);
        setMessages([]);
        setAuthReady(true);
        return;
      }

      // Register or confirm real Admin UID in /admins/{uid}
      const adminPath = `admins/${currentUser.uid}`;
      try {
        const adminRef = doc(db, 'admins', currentUser.uid);
        const snap = await getDoc(adminRef);
        if (!snap.exists()) {
          await setDoc(adminRef, {
            uid: currentUser.uid,
            email: currentUser.email,
            displayName: (currentUser.displayName || 'JUBAYER').slice(0, 100),
            createdAt: serverTimestamp(),
          });
        }
        setIsAdminVerified(true);
      } catch (err) {
        try {
          handleFirestoreError(err, OperationType.WRITE, adminPath);
        } catch (wrapped) {
          setAuthError(
            wrapped instanceof Error ? wrapped.message : 'Admin verification failed.'
          );
        }
        setIsAdminVerified(false);
      } finally {
        setAuthReady(true);
      }
    });

    return () => unsubscribe();
  }, []);

  // Subscribe to real-time messages ONLY after auth & admin verification succeed
  useEffect(() => {
    if (!authReady || !user || !isAdminVerified) {
      return;
    }

    setIsLoadingMessages(true);
    const messagesQuery = query(
      collection(db, 'messages'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      messagesQuery,
      (snapshot) => {
        const nextList: ContactMessageRecord[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            name: typeof data.name === 'string' ? data.name : '',
            email: typeof data.email === 'string' ? data.email : '',
            message: typeof data.message === 'string' ? data.message : '',
            status: data.status === 'read' ? 'read' : 'unread',
            createdAt: data.createdAt ?? null,
            updatedAt: data.updatedAt ?? null,
          };
        });
        setMessages(nextList);
        setIsLoadingMessages(false);
      },
      (error) => {
        setIsLoadingMessages(false);
        handleFirestoreError(error, OperationType.LIST, 'messages');
      }
    );

    return () => unsubscribe();
  }, [authReady, user, isAdminVerified]);

  const handleGoogleSignIn = async () => {
    playTapSound(soundEnabled);
    setAuthError(null);
    setIsSigningIn(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: unknown) {
      const code =
        typeof error === 'object' && error !== null && 'code' in error
          ? String((error as { code?: unknown }).code)
          : '';
      if (code === 'auth/unauthorized-domain') {
        const host = typeof window !== 'undefined' ? window.location.hostname : 'this domain';
        setAuthError(
          lang === 'bn'
            ? `এই ডোমেইন (${host}) Firebase Console → Authentication → Settings → Authorized domains-এ যোগ করা নেই।`
            : `Domain (${host}) is not listed in Firebase Console → Authentication → Settings → Authorized domains.`
        );
      } else if (code === 'auth/popup-blocked') {
        setAuthError(
          lang === 'bn'
            ? 'ব্রাউজারে পপআপ ব্লক করা আছে। অনুগ্রহ করে পপআপ Allow করে আবার চেষ্টা করুন।'
            : 'Browser blocked the sign-in popup. Please allow popups and try again.'
        );
      } else {
        const errMsg = error instanceof Error ? error.message : 'Sign in cancelled.';
        setAuthError(errMsg);
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    playTapSound(soundEnabled);
    await signOut(auth);
  };

  const handleToggleStatus = async (msg: ContactMessageRecord) => {
    playTapSound(soundEnabled);
    setBusyMessageId(msg.id);
    const nextStatus = msg.status === 'read' ? 'unread' : 'read';
    const path = `messages/${msg.id}`;
    try {
      await updateDoc(doc(db, 'messages', msg.id), {
        status: nextStatus,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    } finally {
      setBusyMessageId(null);
    }
  };

  const handleDeleteMessage = async (msgId: string) => {
    playTapSound(soundEnabled);
    setBusyMessageId(msgId);
    const path = `messages/${msgId}`;
    try {
      await deleteDoc(doc(db, 'messages', msgId));
      setConfirmDeleteId(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
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

          {user && (
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

      {/* Loading Auth State */}
      {!authReady ? (
        <div
          className={`rounded-3xl border backdrop-blur-xl p-10 flex flex-col items-center justify-center gap-3 ${cardSurface}`}
        >
          <Loader2 className="w-7 h-7 animate-spin text-amber-400" />
          <p className="text-xs text-slate-400">{t.adminSubtitle}</p>
        </div>
      ) : !user ? (
        /* Unauthenticated Admin Login Screen */
        <div
          className={`rounded-3xl border backdrop-blur-xl p-6 sm:p-8 text-center space-y-5 relative overflow-hidden ${cardSurface}`}
        >
          <div className="absolute top-0 left-10 right-10 h-[1.5px] bg-gradient-to-r from-transparent via-amber-400/70 to-transparent" />

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
              {t.adminSignInTitle}
            </h1>
            <p
              className={`text-xs sm:text-sm max-w-md mx-auto ${
                isLight ? 'text-slate-600' : 'text-slate-300/85'
              }`}
            >
              {t.adminSignInDesc}
            </p>
          </div>

          {authError && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-400/30 rounded-xl px-3 py-2 max-w-sm mx-auto">
              {authError}
            </p>
          )}

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isSigningIn}
            className="inline-flex items-center justify-center gap-2.5 px-6 py-3 rounded-xl font-semibold text-sm bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400 hover:from-amber-300 hover:to-amber-400 text-[#060d1f] shadow-[0_8px_24px_rgba(245,158,11,0.3)] disabled:opacity-65 transition-all active:scale-95"
          >
            {isSigningIn ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{t.adminSigningIn}</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>{t.adminSignInBtn}</span>
              </>
            )}
          </button>
        </div>
      ) : !isAdminVerified ? (
        /* Signed in with Non-Admin Account */
        <div
          className={`rounded-3xl border backdrop-blur-xl p-6 sm:p-8 text-center space-y-4 ${cardSurface}`}
        >
          <div className="w-14 h-14 rounded-2xl bg-red-500/15 border border-red-400/30 text-red-400 flex items-center justify-center mx-auto">
            <ShieldX className="w-7 h-7" />
          </div>
          <h1 className="font-display text-xl font-bold text-red-400">
            {t.adminUnauthorizedTitle}
          </h1>
          <p
            className={`text-xs sm:text-sm max-w-md mx-auto ${
              isLight ? 'text-slate-600' : 'text-slate-300'
            }`}
          >
            {t.adminUnauthorizedDesc}
          </p>
          <div
            className={`text-[11px] font-mono px-3.5 py-2 rounded-xl border max-w-md mx-auto break-all ${
              isLight
                ? 'bg-slate-50 border-slate-200 text-slate-600'
                : 'bg-[#050d20] border-white/10 text-slate-300'
            }`}
          >
            <div>Email: {user.email || 'Unknown'}</div>
            <div>UID: {user.uid}</div>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-500 hover:bg-red-400 text-white text-xs font-semibold transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>{t.adminSignOut}</span>
          </button>
        </div>
      ) : (
        /* Verified Admin Inbox Dashboard */
        <div className="space-y-5">
          {/* Top Identity & Stats Card */}
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

              {/* Verified Admin UID Badge */}
              <button
                type="button"
                onClick={() => handleCopyText(user.uid, 'admin-uid')}
                title={t.adminCopyUid}
                className={`px-3 py-1.5 rounded-xl border text-left transition-colors ${
                  isLight
                    ? 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                    : 'bg-[#050d20]/85 hover:bg-[#0a1838] border-amber-400/25 text-amber-200'
                }`}
              >
                <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider opacity-80">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  <span>{t.adminUidLabel}</span>
                </div>
                <div className="flex items-center gap-1.5 font-mono text-[11px] mt-0.5">
                  <span className="truncate max-w-[155px]">{user.uid}</span>
                  {copiedId === 'admin-uid' ? (
                    <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                  ) : (
                    <Copy className="w-3 h-3 opacity-70 shrink-0" />
                  )}
                </div>
              </button>
            </div>

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
                  className={`w-full pl-9 pr-3 py-2 rounded-xl border text-xs sm:text-sm outline-none focus:ring-2 transition-all ${
                    isLight
                      ? 'bg-slate-50 border-slate-200 text-slate-900 focus:border-amber-500 focus:ring-amber-500/20'
                      : 'bg-[#050d20]/85 border-white/15 text-white placeholder:text-slate-400 focus:border-amber-400 focus:ring-amber-400/20'
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Messages List */}
          {isLoadingMessages ? (
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
