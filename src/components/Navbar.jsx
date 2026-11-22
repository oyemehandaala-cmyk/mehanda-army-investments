import React, { useEffect, useState } from 'react';
import {
  ArrowUpRight, ChevronRight, CreditCard, GraduationCap, Menu, MessageCircle,
  PlayCircle, ShieldCheck, Smartphone, TrendingUp, UserRound, X
} from 'lucide-react';
import BrandVerificationBadge from './BrandVerificationBadge';

export default function Navbar({ currentView, setCurrentView, scrollTo, onMobileMenuChange }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else {
      alert('📱 Mehanda Army Investments App:\nTo install this app on your phone, tap your browser menu (⋮) and tap "Install app" or "Add to Home screen".');
    }
  };

  const navLinks = [
    { name: 'About', href: '#about', icon: '🏢' },
    { name: 'Services', href: '#services', icon: '💼' },
    { name: 'How it works', href: '#process', icon: '⚙️' },
    { name: 'Calculator', href: '#calculator', icon: '🧮' },
    { name: 'Contact', href: '#contact', icon: '📞' },
  ];

  useEffect(() => {
    onMobileMenuChange?.(isMobileMenuOpen);
    return () => onMobileMenuChange?.(false);
  }, [isMobileMenuOpen, onMobileMenuChange]);

  useEffect(() => {
    if (!isMobileMenuOpen) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setIsMobileMenuOpen(false);
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [isMobileMenuOpen]);

  const handleNavClick = (event, href) => {
    event.preventDefault();
    if (scrollTo) {
      scrollTo(href);
    } else {
      const element = document.querySelector(href);
      element?.scrollIntoView({ behavior: 'smooth' });
    }
    setIsMobileMenuOpen(false);
  };

  const navigate = (view) => {
    setCurrentView(view);
    setIsMobileMenuOpen(false);
  };

  const WHATSAPP_URL = 'https://wa.me/919812947813?text=Hello%20Mehanda%20Army%20Investments%2C%20I%20would%20like%20to%20know%20more%20about%20your%20services.';

  return (
    <header className={`sticky top-0 ${isMobileMenuOpen ? 'z-[70]' : 'z-40'} border-b border-slate-200/90 bg-white/95 text-slate-800 shadow-sm backdrop-blur-md`}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          <button
            type="button"
            className="group inline-flex min-w-0 items-center gap-2.5 sm:gap-3 text-left"
            onClick={() => handleNavClick({ preventDefault() {} }, '#hero')}
            aria-label="Mehanda Army Investments home"
          >
            <span className="grid h-9 w-9 sm:h-10 sm:w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-tr from-blue-700 via-blue-600 to-indigo-700 text-white shadow-md shadow-blue-500/20 transition group-hover:brightness-110">
              <TrendingUp size={20} strokeWidth={2.5} aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block text-[13px] sm:text-base font-black leading-tight tracking-wide text-slate-900 whitespace-nowrap">MEHANDA ARMY</span>
              <span className="mt-0.5 flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.16em] sm:tracking-[0.2em] text-blue-700">
                Investments
                <BrandVerificationBadge className="h-3.5 w-3.5 sm:h-[18px] sm:w-[18px]" />
              </span>
            </span>
          </button>

          <nav aria-label="Main navigation" className="hidden items-center gap-4 xl:flex 2xl:gap-6">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                onClick={(event) => handleNavClick(event, link.href)}
                className="whitespace-nowrap text-xs font-semibold text-slate-600 transition hover:text-blue-700"
              >
                {link.name}
              </a>
            ))}
            <button
              type="button"
              onClick={() => navigate('student-loan')}
              className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                currentView === 'student-loan' ? 'bg-blue-100 text-blue-800 font-bold' : 'text-slate-600 hover:bg-slate-100 hover:text-blue-700'
              }`}
            >
              <GraduationCap size={14} className="text-blue-600" aria-hidden="true" />
              Loan
            </button>
            <button
              type="button"
              onClick={() => navigate('investment-info')}
              className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                currentView === 'investment-info' ? 'bg-emerald-100 text-emerald-800 font-bold' : 'text-slate-600 hover:bg-slate-100 hover:text-emerald-700'
              }`}
            >
              <TrendingUp size={14} className="text-emerald-600" aria-hidden="true" />
              Invest Money
            </button>
          </nav>

          {/* Right Side Auth Buttons: Log In & Sign Up */}
          <div className="hidden items-center gap-3 xl:flex">
            <button
              type="button"
              onClick={() => navigate('payments')}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
            >
              <CreditCard size={14} className="text-slate-500" />
              Payments
            </button>
            <button
              type="button"
              onClick={handleInstallClick}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50/70 px-3 text-xs font-bold text-amber-900 transition hover:bg-amber-100 hover:text-amber-950 cursor-pointer"
              title="Install Mehanda Army App"
            >
              <Smartphone size={14} className="text-amber-600" />
              Install App
            </button>
            <button
              type="button"
              onClick={() => navigate('auth-login')}
              className="inline-flex min-h-9 items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-blue-700 transition px-2"
            >
              <UserRound size={14} className="text-slate-500" />
              Log In
            </button>
            <button
              type="button"
              onClick={() => navigate('auth-signup')}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 px-4 py-1.5 text-xs font-bold text-white shadow-md shadow-blue-500/20 transition-all hover:scale-105 active:scale-95"
            >
              Sign Up
            </button>
          </div>

          {/* Mobile Right Controls: Single Clean Primary CTA + Hamburger (Leaves full breathing room for MEHANDA ARMY logo) */}
          <div className="flex shrink-0 items-center gap-2 xl:hidden">
            <button
              type="button"
              onClick={() => navigate('auth-signup')}
              className="inline-flex min-h-9 items-center justify-center rounded-xl bg-blue-600 hover:bg-blue-700 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm shadow-blue-500/25 active:scale-95 transition-all cursor-pointer"
            >
              Sign Up
            </button>
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen((open) => !open)}
              className="grid h-9 w-9 sm:h-10 sm:w-10 place-items-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700 transition hover:bg-slate-100 active:scale-95 cursor-pointer"
              aria-label={isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={isMobileMenuOpen}
              aria-controls="mai-mobile-navigation"
            >
              {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </div>

      {isMobileMenuOpen && (
        <div id="mai-mobile-navigation" className="border-t border-slate-200 bg-white px-3.5 pb-5 pt-3 shadow-2xl xl:hidden max-h-[calc(100vh-4rem)] sm:max-h-[calc(100vh-4.5rem)] overflow-y-auto">
          <nav aria-label="Mobile navigation" className="space-y-1">
            {/* Quick Section Links with Emojis & Compact Font */}
            <div className="grid grid-cols-1 gap-1">
              {navLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  onClick={(event) => handleNavClick(event, link.href)}
                  className="group flex items-center justify-between rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-blue-50/70 hover:text-blue-700 transition active:scale-[0.99]"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-slate-100 group-hover:bg-blue-100 text-sm transition-colors">
                      {link.icon}
                    </span>
                    <span className="font-bold text-slate-800 group-hover:text-blue-700 text-xs">
                      {link.name}
                    </span>
                  </div>
                  <ChevronRight size={14} className="text-slate-300 group-hover:text-blue-600 transition-colors" />
                </a>
              ))}
            </div>

            {/* Highlighted Service Pages with Icons */}
            <div className="pt-2 mt-1 border-t border-slate-100 space-y-1">
              <button
                type="button"
                onClick={() => navigate('student-loan')}
                className="group w-full flex items-center justify-between rounded-xl px-2.5 py-1.5 text-xs font-bold text-blue-700 bg-blue-50/60 hover:bg-blue-100/70 transition active:scale-[0.99] text-left"
              >
                <div className="flex items-center gap-2.5">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-blue-100 text-sm">
                    🎓
                  </span>
                  <span className="font-bold text-blue-800 text-xs">
                    Loan Applications
                  </span>
                </div>
                <span className="text-[10px] bg-blue-200/80 text-blue-800 font-extrabold px-1.5 py-0.5 rounded-md">
                  Apply
                </span>
              </button>

              <button
                type="button"
                onClick={() => navigate('investment-info')}
                className="group w-full flex items-center justify-between rounded-xl px-2.5 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50/60 hover:bg-emerald-100/70 transition active:scale-[0.99] text-left"
              >
                <div className="flex items-center gap-2.5">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-emerald-100 text-sm">
                    📈
                  </span>
                  <span className="font-bold text-emerald-800 text-xs">
                    Investment Plans
                  </span>
                </div>
                <ChevronRight size={14} className="text-emerald-400 group-hover:text-emerald-600" />
              </button>

              <button
                type="button"
                onClick={() => navigate('payments')}
                className="group w-full flex items-center justify-between rounded-xl px-2.5 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50/60 hover:bg-indigo-100/70 transition active:scale-[0.99] text-left cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-indigo-100 text-sm">
                    💳
                  </span>
                  <span className="font-bold text-indigo-800 text-xs">
                    Payment Centre
                  </span>
                </div>
                <ChevronRight size={14} className="text-indigo-400 group-hover:text-indigo-600" />
              </button>

              <button
                type="button"
                onClick={handleInstallClick}
                className="group w-full flex items-center justify-between rounded-xl px-2.5 py-1.5 text-xs font-bold text-amber-900 bg-amber-50 hover:bg-amber-100 transition active:scale-[0.99] text-left border border-amber-200 cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-amber-200 text-sm">
                    📱
                  </span>
                  <span className="font-bold text-amber-950 text-xs">
                    Install Official Mobile App
                  </span>
                </div>
                <span className="text-[10px] bg-amber-300 text-amber-950 font-black px-1.5 py-0.5 rounded-md">
                  PWA
                </span>
              </button>
            </div>

            {/* Auth Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-2.5 mt-1 border-t border-slate-200">
              <button
                type="button"
                onClick={() => navigate('auth-login')}
                className="w-full py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-800 text-center hover:bg-slate-100 transition active:scale-95"
              >
                Log In
              </button>
              <button
                type="button"
                onClick={() => navigate('auth-signup')}
                className="w-full py-2 rounded-xl bg-blue-600 text-white text-xs font-bold text-center shadow-sm hover:bg-blue-700 transition active:scale-95"
              >
                Sign Up
              </button>
            </div>

            {/* AI Assistant & WhatsApp Row */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 px-1">
              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  window.dispatchEvent(new CustomEvent('mai:open-support-chat'));
                }}
                className="hover:text-blue-700 flex items-center gap-1.5 font-bold text-blue-700 transition active:scale-95 text-xs cursor-pointer"
                aria-label="Open AI Customer Support"
              >
                <span className="grid h-6 w-6 place-items-center rounded-lg bg-blue-100 text-sm">🤖</span>
                <span>AI Customer Support</span>
              </button>
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-emerald-600 flex items-center gap-1 font-semibold text-emerald-700 text-xs"
              >
                <MessageCircle size={13} className="text-[#25D366]" /> WhatsApp
              </a>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
