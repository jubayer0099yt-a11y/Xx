import React, { useEffect, useRef, useState } from 'react';
import { Send, CheckCircle2, AlertCircle, Mail, Loader2, X } from 'lucide-react';
import { ThemeConfig } from '../data/themes';
import { Language, TRANSLATIONS } from '../data/i18n';
import { playCopySound, playTapSound } from '../utils/sound';

interface ContactFormSectionProps {
  soundEnabled: boolean;
  themeConfig: ThemeConfig;
  lang: Language;
}

interface FieldErrors {
  name?: string;
  email?: string;
  message?: string;
  general?: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function ContactFormSection({
  soundEnabled,
  themeConfig,
  lang,
}: ContactFormSectionProps) {
  const t = TRANSLATIONS[lang];
  const isLight = Boolean(themeConfig.isLight);

  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const formLoadedAtRef = useRef<number>(Date.now());

  // Close modal on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleOpenModal = () => {
    playTapSound(soundEnabled);
    formLoadedAtRef.current = Date.now();
    setErrors({});
    setIsOpen(true);
  };

  const handleCloseModal = () => {
    playTapSound(soundEnabled);
    setIsOpen(false);
  };

  const validate = (): FieldErrors => {
    const nextErrors: FieldErrors = {};
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedMsg = message.trim();

    if (trimmedName.length < 2) {
      nextErrors.name = t.contactErrName;
    }
    if (!EMAIL_REGEX.test(trimmedEmail)) {
      nextErrors.email = t.contactErrEmail;
    }
    if (trimmedMsg.length < 10) {
      nextErrors.message = t.contactErrMessage;
    }
    return nextErrors;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    playTapSound(soundEnabled);

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          message: message.trim(),
          website: honeypot,
          formLoadedAt: formLoadedAtRef.current,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data?.ok) {
        setErrors({
          general: typeof data?.error === 'string' ? data.error : t.contactErrGeneric,
        });
        return;
      }

      playCopySound(soundEnabled);
      setIsSent(true);
      setName('');
      setEmail('');
      setMessage('');
      setHoneypot('');
      formLoadedAtRef.current = Date.now();
    } catch {
      setErrors({ general: t.contactErrGeneric });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    playTapSound(soundEnabled);
    setIsSent(false);
    setErrors({});
    formLoadedAtRef.current = Date.now();
  };

  const inputBaseClass = isLight
    ? 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:ring-amber-500/20'
    : 'bg-[#050d20]/80 border-white/15 text-white placeholder:text-slate-400/75 focus:border-amber-400 focus:ring-amber-400/20';

  return (
    <>
      {/* Compact Bottom Trigger Button (styled like the Color Theme utility button) */}
      <div className="w-full mt-5 flex justify-center">
        <button
          type="button"
          onClick={handleOpenModal}
          aria-label={t.contactTitle}
          className={`h-9 sm:h-10 px-3.5 sm:px-4 rounded-xl border flex items-center gap-2 text-xs sm:text-sm font-medium transition-all active:scale-95 ${
            isOpen
              ? `${themeConfig.accentBg} shadow-md`
              : isLight
                ? 'bg-white/95 hover:bg-slate-100 text-slate-800 border-slate-200 shadow-sm'
                : 'bg-[#071128]/90 hover:bg-[#0c1b3d] text-neutral-100 border-amber-400/30 shadow-[0_6px_20px_rgba(3,9,24,0.45)]'
          }`}
        >
          <Mail className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isLight ? 'text-amber-600' : 'text-amber-400'}`} />
          <span>{t.contactTitle}</span>
          <span
            className="w-2 h-2 rounded-full bg-amber-400 ring-1 ring-white/50 shadow-sm"
            aria-hidden="true"
          />
        </button>
      </div>

      {/* Contact Me Modal Dialog when Button is Clicked */}
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="contact-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md transition-opacity duration-200"
          onClick={handleCloseModal}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`relative w-full max-w-md rounded-3xl p-5 sm:p-6 border backdrop-blur-xl shadow-2xl animate-in fade-in zoom-in-95 duration-150 ${
              isLight
                ? 'bg-white border-slate-200 text-slate-900'
                : 'bg-[#071128]/95 border-amber-400/30 text-white shadow-[0_20px_60px_rgba(3,9,24,0.8)]'
            }`}
          >
            {/* Subtle top golden accent line */}
            <div className="absolute top-0 left-8 right-8 h-[1.5px] bg-gradient-to-r from-transparent via-amber-400/60 to-transparent pointer-events-none" />

            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 mb-5">
              <div className="flex items-start gap-3">
                <div
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border ${
                    isLight
                      ? 'bg-amber-50 border-amber-200 text-amber-600'
                      : 'bg-amber-400/15 border-amber-400/30 text-amber-300'
                  }`}
                >
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h2
                    id="contact-modal-title"
                    className={`font-display text-lg sm:text-xl font-bold tracking-tight ${
                      isLight ? 'text-slate-900' : 'text-white'
                    }`}
                  >
                    {t.contactTitle}
                  </h2>
                  <p
                    className={`text-xs sm:text-sm mt-0.5 ${
                      isLight ? 'text-slate-600' : 'text-slate-300/85'
                    }`}
                  >
                    {t.contactSubtitle}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCloseModal}
                aria-label="Close contact form"
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors shrink-0 ${
                  isLight
                    ? 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                    : 'bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Success Notification State */}
            {isSent ? (
              <div
                role="status"
                className={`rounded-2xl p-5 border text-center space-y-3 ${
                  isLight
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-emerald-500/10 border-emerald-400/30 text-emerald-100'
                }`}
              >
                <div className="w-11 h-11 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-display text-base font-semibold">
                    {t.contactSuccessTitle}
                  </h3>
                  <p
                    className={`text-xs sm:text-sm mt-1 ${
                      isLight ? 'text-emerald-700' : 'text-emerald-200/85'
                    }`}
                  >
                    {t.contactSuccessDesc}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleReset}
                  className="inline-flex items-center justify-center px-4 py-2 rounded-xl text-xs font-semibold bg-amber-400 hover:bg-amber-300 text-[#060d1f] transition-colors shadow-sm"
                >
                  {t.contactSendAnother}
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} noValidate className="space-y-4">
                {/* Hidden Honeypot field for spam bots */}
                <div className="sr-only" aria-hidden="true">
                  <label htmlFor="contact-website">Website</label>
                  <input
                    id="contact-website"
                    name="website"
                    type="text"
                    tabIndex={-1}
                    autoComplete="off"
                    value={honeypot}
                    onChange={(e) => setHoneypot(e.target.value)}
                  />
                </div>

                {/* Name & Email Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label
                      htmlFor="contact-name"
                      className={`block text-xs font-medium mb-1.5 ${
                        isLight ? 'text-slate-700' : 'text-slate-200'
                      }`}
                    >
                      {t.contactNameLabel}
                    </label>
                    <input
                      id="contact-name"
                      name="name"
                      type="text"
                      maxLength={80}
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
                      }}
                      placeholder={t.contactNamePlaceholder}
                      aria-invalid={Boolean(errors.name)}
                      className={`w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 transition-all ${inputBaseClass} ${
                        errors.name ? 'border-red-400/80' : ''
                      }`}
                    />
                    {errors.name && (
                      <p className={`mt-1 text-[11px] flex items-center gap-1 ${isLight ? 'text-red-600' : 'text-red-400'}`}>
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        <span>{errors.name}</span>
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="contact-email"
                      className={`block text-xs font-medium mb-1.5 ${
                        isLight ? 'text-slate-700' : 'text-slate-200'
                      }`}
                    >
                      {t.contactEmailLabel}
                    </label>
                    <input
                      id="contact-email"
                      name="email"
                      type="email"
                      maxLength={120}
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
                      }}
                      placeholder={t.contactEmailPlaceholder}
                      aria-invalid={Boolean(errors.email)}
                      className={`w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 transition-all ${inputBaseClass} ${
                        errors.email ? 'border-red-400/80' : ''
                      }`}
                    />
                    {errors.email && (
                      <p className={`mt-1 text-[11px] flex items-center gap-1 ${isLight ? 'text-red-600' : 'text-red-400'}`}>
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        <span>{errors.email}</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Message */}
                <div>
                  <label
                    htmlFor="contact-message"
                    className={`block text-xs font-medium mb-1.5 ${
                      isLight ? 'text-slate-700' : 'text-slate-200'
                    }`}
                  >
                    {t.contactMessageLabel}
                  </label>
                  <textarea
                    id="contact-message"
                    name="message"
                    rows={4}
                    maxLength={1500}
                    value={message}
                    onChange={(e) => {
                      setMessage(e.target.value);
                      if (errors.message) setErrors((prev) => ({ ...prev, message: undefined }));
                    }}
                    placeholder={t.contactMessagePlaceholder}
                    aria-invalid={Boolean(errors.message)}
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 transition-all resize-none ${inputBaseClass} ${
                      errors.message ? 'border-red-400/80' : ''
                    }`}
                  />
                  {errors.message && (
                    <p className={`mt-1 text-[11px] flex items-center gap-1 ${isLight ? 'text-red-600' : 'text-red-400'}`}>
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      <span>{errors.message}</span>
                    </p>
                  )}
                </div>

                {/* General server/network error */}
                {errors.general && (
                  <div
                    role="alert"
                    className={`px-3.5 py-2.5 rounded-xl border text-xs flex items-center gap-2 ${
                      isLight
                        ? 'bg-red-50 border-red-200 text-red-700'
                        : 'bg-red-500/15 border-red-400/35 text-red-300'
                    }`}
                  >
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{errors.general}</span>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 px-5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400 hover:from-amber-300 hover:via-amber-400 hover:to-amber-300 text-[#060d1f] shadow-[0_6px_22px_rgba(245,158,11,0.3)] disabled:opacity-65 disabled:cursor-not-allowed transition-all active:scale-[0.99]"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{t.contactSending}</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>{t.contactSend}</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
