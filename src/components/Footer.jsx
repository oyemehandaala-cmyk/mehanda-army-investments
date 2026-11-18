import React, { useState } from 'react';
import {
  TrendingUp, Phone, Mail, MessageCircle, ShieldCheck, CreditCard,
  ArrowUpRight, ChevronRight, CheckCircle2, Sparkles,
  ArrowUp, Award, ExternalLink
} from 'lucide-react';
import BrandVerificationBadge from './BrandVerificationBadge';

export default function Footer({ scrollTo, openLegalModal, setCurrentView }) {
  const [copiedContact, setCopiedContact] = useState(null);

  const OFFICIAL_PHONE = "+91 98129 47813";
  const OFFICIAL_PHONE_RAW = "+919812947813";
  const OFFICIAL_WHATSAPP_URL = "https://wa.me/919812947813?text=Hello%20Mehanda%20Army%20Investments%2C%20I%20would%20like%20to%20know%20more%20about%20your%20services.";
  const OFFICIAL_EMAIL = "info@mehandaarmy.net";

  const handleCopy = (text, type) => {
    navigator.clipboard?.writeText(text).then(() => {
      setCopiedContact(type);
      setTimeout(() => setCopiedContact(null), 2200);
    }).catch(() => {});
  };

  const navLinks = [
    { name: 'About Us', href: '#about' },
    { name: 'Strategic Services', href: '#services' },
    { name: 'How It Works', href: '#process' },
    { name: 'Returns Calculator', href: '#calculator' },
    { name: 'Student Loan Enquiry', action: () => setCurrentView?.('student-loan') },
    { name: 'Contact Advisor', href: '#contact' },
  ];

  return (
    <footer className="relative bg-[#06080F] text-slate-300 overflow-hidden font-sans border-t border-amber-500/20">
      
      {/* ── 1. AMBIENT GLOW & GOLDEN LIGHT RAYS (Subtle background animation) ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Top Centered Radiant Golden Aura */}
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-gradient-to-b from-[#E5B652]/15 via-amber-600/5 to-transparent blur-[120px] rounded-full" />
        
        {/* Left Subtle Teal/Emerald Accent */}
        <div className="absolute -bottom-20 -left-20 w-[400px] h-[300px] bg-emerald-500/5 blur-[100px] rounded-full" />
        
        {/* Right Subtle Gold Accent */}
        <div className="absolute top-1/3 -right-20 w-[350px] h-[350px] bg-amber-500/5 blur-[110px] rounded-full" />
        
        {/* Fine Animated Golden Grid Lines / Mesh */}
        <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(#E5B652_1px,transparent_1px)] [background-size:24px_24px]" />
      </div>

      {/* ── 2. TOP EXECUTIVE GOLDEN ACCENT SHIMMER LINE ── */}
      <div className="relative w-full h-[2px] bg-gradient-to-r from-transparent via-[#E5B652] to-transparent shadow-[0_0_20px_rgba(229,182,82,0.6)]" />

      {/* ── 3. LUXURY PRE-FOOTER BANNER (CTA & Trust Badge) ── */}
      <div className="relative z-10 border-b border-white/[0.08] bg-gradient-to-r from-white/[0.02] via-white/[0.04] to-white/[0.02] backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-8 flex flex-col md:flex-row items-center justify-between gap-4 sm:gap-6">
          <div className="flex items-center gap-3 sm:gap-4 text-center md:text-left">
            <div className="relative w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-[#876A2E] via-[#E5B652] to-[#FFF0BA] p-[1px] shadow-lg shadow-amber-500/20 shrink-0">
              <div className="w-full h-full rounded-xl sm:rounded-2xl bg-[#0B0F19] flex items-center justify-center text-amber-400">
                <Sparkles size={18} className="sm:w-[22px] sm:h-[22px] animate-pulse" />
              </div>
            </div>
            <div>
              <div className="hidden md:inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-bold text-emerald-400 mb-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                Disciplined Financial Consultancy Desk • 256-Bit SSL Encrypted
              </div>
              <h3 className="text-sm sm:text-lg font-black text-white tracking-tight leading-snug">
                Empowering India's Investors &amp; Defense Families with Disciplined Wealth
              </h3>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center justify-center gap-2 sm:gap-3 w-full sm:w-auto shrink-0">
            <button
              type="button"
              onClick={() => setCurrentView ? setCurrentView('payments') : null}
              className="group relative inline-flex items-center justify-center gap-1.5 sm:gap-2 rounded-xl bg-gradient-to-r from-[#DFB24E] to-[#C89632] px-3 sm:px-5 py-2.5 text-xs font-black text-black shadow-md shadow-amber-500/20 hover:brightness-110 active:scale-95 transition-all overflow-hidden cursor-pointer w-full sm:w-auto text-center"
            >
              <CreditCard size={14} className="shrink-0" />
              <span className="truncate">Payment Centre</span>
              <ArrowUpRight size={13} className="hidden sm:inline group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </button>

            <a
              href={OFFICIAL_WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 sm:gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 px-3 sm:px-5 py-2.5 text-xs font-bold text-emerald-300 backdrop-blur-md active:scale-95 transition-all w-full sm:w-auto text-center"
            >
              <MessageCircle size={14} className="shrink-0" />
              <span className="truncate">Talk to Advisor</span>
            </a>
          </div>
        </div>
      </div>

      {/* ── 4. MAIN FOOTER CONTENT GRID ── */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-14 pb-8 sm:pb-10">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-12 mb-8 sm:mb-12">
          
          {/* BRAND COLUMN (Span 5) */}
          <div className="md:col-span-5 space-y-4 sm:space-y-5">
            {/* Logo Badge */}
            <div className="flex items-center gap-3">
              <div className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-amber-600 via-amber-400 to-[#FFF1B0] p-[1.5px] shadow-lg shadow-amber-500/25 shrink-0 group">
                <div className="w-full h-full rounded-xl sm:rounded-2xl bg-gradient-to-b from-[#111726] to-[#0A0D15] flex items-center justify-center text-amber-400 transition-transform group-hover:scale-105">
                  <TrendingUp size={20} className="sm:w-[23px] sm:h-[23px]" strokeWidth={2.5} />
                </div>
              </div>
              <div>
                <span className="flex items-center gap-1.5 font-black text-base sm:text-lg text-white tracking-wide">
                  MEHANDA ARMY INVESTMENTS
                  <BrandVerificationBadge className="h-4 w-4 sm:h-5 sm:w-5" />
                </span>
                <span className="text-amber-400/90 text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.18em] block">
                  Disciplined Wealth Management
                </span>
              </div>
            </div>

            {/* Description */}
            <p className="text-xs sm:text-sm text-slate-400 max-w-md leading-relaxed font-normal">
              Structured multi-asset portfolio planning, systematic wealth architecture, and capital preservation engineered for working professionals, defense veterans, and families across India.
            </p>

            {/* Translucent Glass Statutory Risk Card */}
            <div className="group relative rounded-xl sm:rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.04] to-white/[0.01] p-3 sm:p-4 backdrop-blur-md hover:border-amber-400/30 transition-all duration-300">
              <div className="flex items-start gap-2.5">
                <ShieldCheck size={16} className="sm:w-[18px] sm:h-[18px] text-amber-400 shrink-0 mt-0.5" />
                <div className="text-[10px] sm:text-[11px] leading-relaxed text-slate-300">
                  <strong className="text-amber-300 font-bold tracking-wide uppercase block text-[9px] sm:text-[10px] mb-0.5 sm:mb-1">
                    Statutory Risk Disclosure
                  </strong>
                  Securities markets, mutual funds, and market-linked products are subject to market risks. Read all scheme related documents carefully before investing. Past performance does not guarantee future results.
                </div>
              </div>
            </div>
          </div>

          {/* NAVIGATION LINKS (Span 4) */}
          <div className="md:col-span-4">
            <h4 className="flex items-center gap-2 text-white font-black text-xs uppercase tracking-[0.2em] mb-3 sm:mb-5">
              <span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_8px_#E5B652]" />
              Navigation &amp; Services
            </h4>
            
            <ul className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs sm:text-sm">
              <li className="col-span-2 sm:col-span-1">
                <button
                  type="button"
                  onClick={() => setCurrentView ? setCurrentView('payments') : null}
                  className="group inline-flex items-center gap-1.5 text-amber-300 font-bold hover:text-white transition-all cursor-pointer"
                >
                  <CreditCard size={13} className="text-amber-400 group-hover:scale-110 transition-transform" />
                  <span>Payment Centre</span>
                </button>
              </li>

              {navLinks.map((link) => (
                <li key={link.name}>
                  {link.action ? (
                    <button
                      type="button"
                      onClick={link.action}
                      className="group inline-flex items-center gap-1.5 text-slate-400 hover:text-amber-300 transition-colors cursor-pointer text-left"
                    >
                      <ChevronRight size={12} className="text-slate-600 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all shrink-0" />
                      <span className="truncate">{link.name}</span>
                    </button>
                  ) : (
                    <a
                      href={link.href}
                      onClick={(e) => {
                        e.preventDefault();
                        scrollTo?.(link.href);
                      }}
                      className="group inline-flex items-center gap-1.5 text-slate-400 hover:text-amber-300 transition-colors text-left"
                    >
                      <ChevronRight size={12} className="text-slate-600 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all shrink-0" />
                      <span className="truncate">{link.name}</span>
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* LEGAL & DISCLOSURES (Span 3) */}
          <div className="md:col-span-3">
            <h4 className="flex items-center gap-2 text-white font-black text-xs uppercase tracking-[0.2em] mb-3 sm:mb-5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34D399]" />
              Legal &amp; Compliance
            </h4>

            <ul className="grid grid-cols-2 sm:grid-cols-1 gap-2 sm:space-y-3 sm:block text-xs sm:text-sm">
              <li>
                <a
                  href="/privacy-policy"
                  onClick={(e) => {
                    e.preventDefault();
                    if (setCurrentView) {
                      setCurrentView('privacy-policy');
                    } else {
                      window.location.href = '/privacy-policy';
                    }
                  }}
                  className="group flex items-center justify-between text-slate-400 hover:text-white transition-colors py-1 border-b border-white/[0.04]"
                >
                  <span className="truncate">Privacy Policy</span>
                  <ArrowUpRight size={13} className="text-slate-600 group-hover:text-amber-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all shrink-0" />
                </a>
              </li>

              <li>
                <a
                  href="/terms-and-conditions"
                  onClick={(e) => {
                    e.preventDefault();
                    if (setCurrentView) {
                      setCurrentView('terms-and-conditions');
                    } else {
                      window.location.href = '/terms-and-conditions';
                    }
                  }}
                  className="group flex items-center justify-between text-slate-400 hover:text-white transition-colors py-1 border-b border-white/[0.04]"
                >
                  <span className="truncate">Terms &amp; Conditions</span>
                  <ArrowUpRight size={13} className="text-slate-600 group-hover:text-amber-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all shrink-0" />
                </a>
              </li>

              <li>
                <button
                  type="button"
                  onClick={() => openLegalModal?.('Risk Disclosure')}
                  className="group flex items-center justify-between w-full text-slate-400 hover:text-white transition-colors py-1 border-b border-white/[0.04] text-left cursor-pointer"
                >
                  <span className="truncate">Risk Disclosure</span>
                  <ChevronRight size={13} className="text-slate-600 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all shrink-0" />
                </button>
              </li>

              <li>
                <button
                  type="button"
                  onClick={() => openLegalModal?.('Grievance Officer')}
                  className="group flex items-center justify-between w-full text-slate-400 hover:text-white transition-colors py-1 text-left cursor-pointer"
                >
                  <span className="truncate">Grievance Redressal</span>
                  <ChevronRight size={13} className="text-slate-600 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all shrink-0" />
                </button>
              </li>
            </ul>

            {/* Fiduciary Badge */}
            <div className="mt-4 sm:mt-6 flex items-center gap-2.5 rounded-xl border border-white/5 bg-white/[0.02] p-2.5 sm:p-3 text-[10px] sm:text-[11px] text-slate-400">
              <Award size={16} className="text-[#E5B652] shrink-0" />
              <span>Adherence to standard fiduciary principles &amp; investor protection standards.</span>
            </div>
          </div>

        </div>

        {/* ── 5. THREE LUXURY CONTACT CARDS ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-4 pt-6 sm:pt-8 border-t border-white/10 mb-6 sm:mb-8">
          
          {/* Card 1: Phone */}
          <a
            href={`tel:${OFFICIAL_PHONE_RAW}`}
            className="group relative flex items-center gap-3 rounded-xl sm:rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.04] to-transparent p-3 sm:p-4 hover:border-amber-400/50 hover:bg-white/[0.06] transition-all duration-300 shadow-md"
          >
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-300 shrink-0 group-hover:scale-110 group-hover:bg-amber-400/20 transition-all">
              <Phone size={15} className="sm:w-[18px] sm:h-[18px]" />
            </div>
            <div className="min-w-0">
              <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-400">Official Helpline</p>
              <p className="text-xs sm:text-sm font-black text-white group-hover:text-amber-300 transition-colors truncate">
                {OFFICIAL_PHONE}
              </p>
            </div>
          </a>

          {/* Card 2: Email */}
          <a
            href={`mailto:${OFFICIAL_EMAIL}`}
            className="group relative flex items-center gap-3 rounded-xl sm:rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.04] to-transparent p-3 sm:p-4 hover:border-amber-400/50 hover:bg-white/[0.06] transition-all duration-300 shadow-md"
          >
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-blue-400/10 border border-blue-400/30 flex items-center justify-center text-blue-300 shrink-0 group-hover:scale-110 group-hover:bg-blue-400/20 transition-all">
              <Mail size={15} className="sm:w-[18px] sm:h-[18px]" />
            </div>
            <div className="min-w-0">
              <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-400">Written Inquiries</p>
              <p className="text-xs sm:text-sm font-black text-white group-hover:text-blue-300 transition-colors truncate">
                {OFFICIAL_EMAIL}
              </p>
            </div>
          </a>

          {/* Card 3: WhatsApp Support */}
          <a
            href={OFFICIAL_WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative flex items-center gap-3 rounded-xl sm:rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 to-transparent p-3 sm:p-4 hover:border-emerald-400/60 hover:bg-emerald-500/15 transition-all duration-300 shadow-md"
          >
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0 group-hover:scale-110 transition-all">
              <MessageCircle size={15} className="sm:w-[18px] sm:h-[18px]" />
            </div>
            <div className="min-w-0">
              <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-emerald-400/90 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live Support
              </p>
              <p className="text-xs sm:text-sm font-black text-white group-hover:text-emerald-300 transition-colors truncate">
                WhatsApp Advisory Desk
              </p>
            </div>
          </a>

        </div>

        {/* ── STATUTORY, INTERMEDIARY & NON-AFFILIATION NOTICE ── */}
        <div className="rounded-xl sm:rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.02] to-transparent p-3.5 sm:p-5 text-[10px] sm:text-[11px] text-slate-400/90 leading-relaxed space-y-2 sm:space-y-2.5 mb-6">
          <div className="flex items-center gap-2 pb-2 border-b border-white/5 text-amber-400 font-bold uppercase tracking-wider text-[9px] sm:text-[10px]">
            <ShieldCheck size={14} />
            <span>Statutory &amp; Intermediary Compliance Disclosures</span>
          </div>
          <p>
            <strong className="text-slate-200 font-semibold">1. Loan Facilitation Intermediary Notice:</strong> Mehanda Army Investments acts strictly as an independent financial consultancy, digital lead referral portal, and loan sourcing desk (DSA channel model). We are <strong>NOT a Bank or Non-Banking Financial Company (NBFC)</strong> and do not provide direct loans or credit from our own balance sheet. All loan facilities, credit evaluations, underwriting approvals, interest rates, and loan disbursements are executed exclusively by government &amp; RBI-registered banks, NBFCs, and authorized lending institutions.
          </p>
          <p>
            <strong className="text-slate-200 font-semibold">2. Trade Name &amp; Non-Affiliation Declaration:</strong> The trade name &ldquo;Mehanda Army Investments&rdquo; is an independent private commercial consultancy. This platform is <strong>NOT affiliated with, sponsored by, or an official agency of the Ministry of Defence, Indian Armed Forces, or the Government of India</strong>.
          </p>
          <p>
            <strong className="text-slate-200 font-semibold">3. Fraud Prevention &amp; Zero Advance Fee Advisory:</strong> We NEVER charge or demand any upfront loan approval fee, file processing cash in personal bank accounts, or confidential OTP passwords. Please do not transfer money or share private banking credentials with anyone claiming to represent Mehanda Army Investments.
          </p>
        </div>

        {/* ── 6. BOTTOM COPYRIGHT & SECURITY DISCLOSURE ── */}
        <div className="border-t border-white/[0.08] pt-6 sm:pt-8 flex flex-col md:flex-row justify-between items-center gap-3 sm:gap-4 text-[10px] sm:text-xs text-slate-500">
          <p className="text-center md:text-left">
            &copy; {new Date().getFullYear()} <strong className="text-slate-300">MEHANDA ARMY INVESTMENTS</strong>. All rights reserved.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-3 text-[10px] sm:text-[11px] text-slate-400">
            <span className="flex items-center gap-1.5">
              <ShieldCheck size={13} className="text-amber-400" />
              Disciplined Wealth Management &amp; Client Fiduciary Focus
            </span>
            <span className="hidden sm:inline text-slate-700">•</span>
            <span className="text-slate-500">Made with pride in India 🇮🇳</span>
          </div>
        </div>

      </div>

    </footer>
  );
}
