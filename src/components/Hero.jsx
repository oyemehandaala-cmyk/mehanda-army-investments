import React from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  ShieldCheck,
  Zap,
  Handshake,
  Headphones,
  TrendingUp,
  CreditCard,
  GraduationCap,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import HeroFinancialCardIllustration from './HeroFinancialCardIllustration.jsx';

/**
 * Hero Section
 * Modern Corporate Finance Standard (like Bajaj Finserv, Tata Capital, Groww):
 * - Clean, bright, institutional white & slate background
 * - High-trust corporate badge
 * - Clear headline & value proposition
 * - 5 Instant Loan Category / Investment Quick Pills
 * - Primary & Secondary high-converting CTAs
 * - 3D Financial Stage Illustration
 * - 5 bottom trust metrics
 */
export default function Hero({ setCurrentView, scrollTo }) {
  const loanQuickPills = [
    { name: 'Student Loan', desc: 'Higher Education', icon: GraduationCap, view: 'student-loan' },
    { name: 'Dairy Loan', desc: '₹2L - ₹50 Lakhs', icon: Sparkles, view: 'loan-categories' },
    { name: 'Sheep Loan', desc: 'Up to ₹2 Lakhs', icon: CheckCircle2, view: 'loan-categories' },
    { name: 'Goat Loan', desc: 'Up to ₹2 Lakhs', icon: CheckCircle2, view: 'loan-categories' },
    { name: 'Wealth Investment', desc: 'Compounding Growth', icon: TrendingUp, view: 'investment-info' },
  ];

  return (
    <section id="hero" className="relative overflow-hidden bg-gradient-to-b from-slate-50 via-white to-blue-50/30 text-slate-900 border-b border-slate-200/80">
      {/* Background Subtle Corporate Radial Highlights */}
      <div className="pointer-events-none absolute -top-40 right-10 h-[45rem] w-[45rem] rounded-full bg-radial from-blue-400/10 via-indigo-200/5 to-transparent blur-3xl" />
      <div className="pointer-events-none absolute top-1/3 left-0 h-[36rem] w-[36rem] rounded-full bg-radial from-emerald-400/10 via-teal-100/5 to-transparent blur-3xl" />

      {/* Subtle Corporate Grid Mesh Pattern */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.03] bg-[radial-gradient(#1E40AF_1px,transparent_1px)] [background-size:20px_20px]" aria-hidden="true" />

      {/* MAIN CONTENT GRID */}
      <div className="relative mx-auto max-w-7xl px-4 pt-2 pb-8 sm:px-6 sm:pt-4 sm:pb-12 lg:px-8 lg:pt-5 lg:pb-14">
        <div className="grid items-center gap-8 sm:gap-10 lg:grid-cols-[1.1fr_.9fr] lg:gap-10">
          
          {/* LEFT COLUMN: HERO HEADLINE & CTAS */}
          <div className="relative z-10">
            
            {/* Giant Headline: Big Finance Corporate Typography */}
            <h1 className="text-2xl font-black leading-[1.18] tracking-tight sm:text-4xl lg:text-[3.25rem] text-slate-900">
              <span className="block text-blue-700">
                Mehanda Army Investments
              </span>
              <span className="block text-slate-900 mt-1 sm:mt-1.5 font-extrabold text-xl sm:text-3xl lg:text-[2.6rem]">
                Smart Finance. Secure Future.
              </span>
            </h1>

            {/* Value Proposition Description */}
            <p className="mt-3 sm:mt-4 max-w-xl text-xs sm:text-base leading-relaxed sm:leading-7 text-slate-600 font-normal">
              Get transparent Student Education Loans, specialized Agri-Farming Loans (Dairy, Sheep, Goat) and customized wealth investment solutions for families and entrepreneurs across India.
            </p>

            {/* Quick Loan Categories Selector Pills */}
            <div className="mt-5 sm:mt-6">
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                Instant Loan & Investment Solutions:
              </span>
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {loanQuickPills.map((pill) => {
                  const Icon = pill.icon;
                  return (
                    <button
                      key={pill.name}
                      type="button"
                      onClick={() => setCurrentView(pill.view)}
                      className="group inline-flex items-center gap-1 sm:gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 sm:px-3 text-[11px] sm:text-xs font-bold text-slate-700 shadow-xs hover:border-blue-500 hover:bg-blue-50 hover:text-blue-700 transition cursor-pointer active:scale-95"
                    >
                      <Icon size={13} className="text-blue-600 group-hover:scale-110 transition-transform shrink-0" />
                      <span>{pill.name}</span>
                      <span className="text-[10px] font-normal text-slate-500 hidden xs:inline sm:inline">({pill.desc})</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Action Buttons (Corporate Finance Style: Full width on mobile, inline on desktop) */}
            <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3.5">
              {/* Button 1: Apply for Loan Online (Royal Blue High-Converting Button) */}
              <button
                type="button"
                onClick={() => setCurrentView('student-loan')}
                className="w-full sm:w-auto inline-flex min-h-[46px] sm:min-h-[48px] items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-blue-500/20 transition-all hover:scale-102 active:scale-95 cursor-pointer"
              >
                <span>Apply for Loan Online</span>
                <ArrowRight size={16} />
              </button>

              {/* Button 2: Explore Investments (Crisp White Card Button) */}
              <button
                type="button"
                onClick={() => setCurrentView('investment-info')}
                className="w-full sm:w-auto inline-flex min-h-[46px] sm:min-h-[48px] items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 px-6 py-3 text-sm font-bold text-slate-800 shadow-xs transition-all active:scale-95 cursor-pointer"
              >
                <span>Explore Investment Plans</span>
                <ArrowUpRight size={16} className="text-slate-500" />
              </button>

              <button
                type="button"
                onClick={() => scrollTo('#calculator')}
                className="w-full sm:w-auto inline-flex min-h-[40px] items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-600 hover:text-blue-700 transition text-center"
              >
                Calculate EMI ➔
              </button>
            </div>

            {/* Trust Micro-Row */}
            <div className="mt-5 sm:mt-6 flex flex-wrap items-center gap-y-2 gap-x-4 sm:gap-x-5 text-[11px] sm:text-xs text-slate-500">
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                100% Paperless Process
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                Direct Bank Disbursal
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                Zero Hidden Charges
              </span>
            </div>

          </div>

          {/* RIGHT COLUMN: 3D ILLUSTRATION / INTERACTIVE FINANCIAL DISPLAY */}
          <div className="relative flex items-center justify-center lg:justify-end">
            <HeroFinancialCardIllustration />
          </div>

        </div>

        {/* 5 BOTTOM TRUST HIGHLIGHTS (Crisp Corporate Badges) */}
        <div className="mt-10 sm:mt-12 pt-6 sm:pt-8 border-t border-slate-200">
          <div className="grid grid-cols-2 gap-2.5 sm:gap-4 sm:grid-cols-3 lg:grid-cols-5">
            
            {/* Highlight 1: 100% Secure & Trusted */}
            <div className="flex items-center gap-3 rounded-xl border border-slate-200/80 bg-white p-3 shadow-xs">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-blue-50 text-blue-700">
                <ShieldCheck size={18} strokeWidth={2.2} />
              </div>
              <div className="min-w-0">
                <div className="truncate text-xs font-black text-slate-900">100% Secure</div>
                <div className="truncate text-[11px] text-slate-600">Verified Loan Desk</div>
              </div>
            </div>

            {/* Highlight 2: Fast Process Quick Approval */}
            <div className="flex items-center gap-3 rounded-xl border border-slate-200/80 bg-white p-3 shadow-xs">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-emerald-50 text-emerald-700">
                <Zap size={18} strokeWidth={2.2} />
              </div>
              <div className="min-w-0">
                <div className="truncate text-xs font-black text-slate-900">Fast Process</div>
                <div className="truncate text-[11px] text-slate-600">Digital Approval</div>
              </div>
            </div>

            {/* Highlight 3: Transparent & Fair Policy */}
            <div className="flex items-center gap-3 rounded-xl border border-slate-200/80 bg-white p-3 shadow-xs">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-indigo-50 text-indigo-700">
                <Handshake size={18} strokeWidth={2.2} />
              </div>
              <div className="min-w-0">
                <div className="truncate text-xs font-black text-slate-900">Fair Terms</div>
                <div className="truncate text-[11px] text-slate-600">No Hidden Costs</div>
              </div>
            </div>

            {/* Highlight 4: 24/7 Dedicated Support */}
            <div className="flex items-center gap-3 rounded-xl border border-slate-200/80 bg-white p-3 shadow-xs">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-amber-50 text-amber-700">
                <Headphones size={18} strokeWidth={2.2} />
              </div>
              <div className="min-w-0">
                <div className="truncate text-xs font-black text-slate-900">Direct Support</div>
                <div className="truncate text-[11px] text-slate-600">+91 98129 47813</div>
              </div>
            </div>

            {/* Highlight 5: 10,000+ Happy Customers */}
            <div className="col-span-2 flex items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-white p-3 shadow-xs sm:col-span-1">
              <div>
                <div className="text-xs font-black text-slate-900">10,000+ Clients</div>
                <div className="text-[11px] text-emerald-700 font-bold">4.9/5 Trust Rating</div>
              </div>
              <div className="flex -space-x-1.5 overflow-hidden">
                <img
                  className="inline-block h-7 w-7 rounded-full ring-2 ring-white object-cover"
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=80&h=80&q=80"
                  alt="Customer avatar"
                />
                <img
                  className="inline-block h-7 w-7 rounded-full ring-2 ring-white object-cover"
                  src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=80&h=80&q=80"
                  alt="Customer avatar"
                />
                <img
                  className="inline-block h-7 w-7 rounded-full ring-2 ring-white object-cover"
                  src="https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=80&h=80&q=80"
                  alt="Customer avatar"
                />
              </div>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
}
