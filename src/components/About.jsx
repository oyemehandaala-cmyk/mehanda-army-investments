import React from 'react';
import { Target, Compass, Eye, ShieldCheck, Check, FileCheck2, MessageSquare, Scale, UserRound, Award } from 'lucide-react';

export default function About() {
  return (
    <section id="about" className="relative py-12 sm:py-16 md:py-24 bg-white text-slate-900 border-b border-slate-200 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Heading (Institutional Standard) */}
        <div className="max-w-3xl mx-auto text-center mb-12">
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full border border-blue-200 bg-blue-50 text-xs font-bold uppercase tracking-wider text-blue-700 mb-3 shadow-xs">
            ★ Corporate Credibility & Heritage
          </span>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight">
            A Responsible Approach to Lending & Wealth
          </h2>
          <div className="w-16 h-1 bg-blue-600 mx-auto mt-3 rounded-full"></div>
          <p className="mt-3 text-sm sm:text-base text-slate-600 leading-relaxed font-normal">
            At <strong className="text-blue-700">Mehanda Army Investments</strong>, we act as a dedicated financial consultancy and digital loan facilitation platform, connecting students, dairy & livestock farmers, defense personnel, and families across India with government & RBI-registered banks and authorized lending institutions.
          </p>
        </div>

        {/* 3 Core Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {/* Pillar 1 */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-6 shadow-xs hover:shadow-md hover:border-blue-400 transition-all duration-300">
            <div className="w-12 h-12 bg-blue-100 border border-blue-200 rounded-xl flex items-center justify-center text-blue-700 mb-4 shadow-xs">
              <Compass size={22} />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Our Mission</h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              To empower ambitious students, dairy & livestock farmers, defense personnel, and families across India with accessible capital and structured financial planning.
            </p>
          </div>

          {/* Pillar 2 */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-6 shadow-xs hover:shadow-md hover:border-emerald-400 transition-all duration-300">
            <div className="w-12 h-12 bg-emerald-100 border border-emerald-200 rounded-xl flex items-center justify-center text-emerald-700 mb-4 shadow-xs">
              <Eye size={22} />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Unwavering Transparency</h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Clear terms, zero hidden processing charges, and paperless digital documentation. Every applicant receives clear repayment terms and upfront fee breakdowns.
            </p>
          </div>

          {/* Pillar 3 */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-6 shadow-xs hover:shadow-md hover:border-indigo-400 transition-all duration-300">
            <div className="w-12 h-12 bg-indigo-100 border border-indigo-200 rounded-xl flex items-center justify-center text-indigo-700 mb-4 shadow-xs">
              <Target size={22} />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Disciplined Advisory</h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Every loan evaluation and investment recommendation is based on applicant creditworthiness, cash-flow capability, and risk capacity with direct relationship officer support.
            </p>
          </div>
        </div>

        {/* Ethical Standards Commitment */}
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 sm:p-8 shadow-xs">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-8">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-bold uppercase tracking-wider mb-3">
                <ShieldCheck size={14} className="text-emerald-700" /> Statutory & Fiduciary Compliance
              </div>
              <h4 className="text-xl sm:text-2xl font-black text-slate-900 mb-2">
                Our Ethical Commitment to Every Borrower & Investor
              </h4>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-5 font-normal">
                Financial decisions deserve clear clarity and trust. We uphold strict compliance with fair practice lending codes, independent evaluation, and zero speculative or misleading promises.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-700">
                <div className="flex items-center gap-2">
                  <Check size={15} className="text-emerald-600 shrink-0 font-bold" /> Clear disclosure of loan interest & tenure
                </div>
                <div className="flex items-center gap-2">
                  <Check size={15} className="text-emerald-600 shrink-0 font-bold" /> Solutions tailored to applicant repayment capacity
                </div>
                <div className="flex items-center gap-2">
                  <Check size={15} className="text-emerald-600 shrink-0 font-bold" /> Direct contact with certified advisory desk
                </div>
                <div className="flex items-center gap-2">
                  <Check size={15} className="text-emerald-600 shrink-0 font-bold" /> No hidden fees or advance deposit traps
                </div>
              </div>
            </div>

            <div className="lg:col-span-4 bg-white p-6 rounded-xl border border-slate-200 text-center shadow-sm">
              <Award size={36} className="text-blue-600 mx-auto mb-2" />
              <h5 className="text-sm font-bold text-slate-900">Dedicated Loan Facilitation Desk</h5>
              <p className="text-[11px] text-slate-500 mt-1">
                Connecting applicants directly with government & RBI-registered banks and NBFCs with zero advance commission.
              </p>
              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-center gap-1.5 text-xs font-bold text-blue-700">
                <ShieldCheck size={14} className="text-emerald-600" />
                Trusted Sourcing & Referral Partner
              </div>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
