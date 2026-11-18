import React from 'react';
import { Scale, ShieldCheck, AlertTriangle, ArrowLeft, Phone, Mail, MessageCircle, FileText, CheckCircle } from 'lucide-react';
import Navbar from './Navbar';
import Footer from './Footer';
import BrandVerificationBadge from './BrandVerificationBadge';

export default function TermsAndConditions({ setCurrentView, scrollTo, openLegalModal }) {
  const OFFICIAL_PHONE = "+91 9812947813";
  const OFFICIAL_EMAIL = "info@mehandaarmy.net";

  return (
    <div className="font-sans text-slate-900 bg-slate-50 min-h-screen flex flex-col selection:bg-[#876A2E] selection:text-white">
      {/* Top Navbar */}
      <Navbar
        currentView="terms-and-conditions"
        setCurrentView={setCurrentView}
        scrollTo={scrollTo}
      />

      {/* Hero Header */}
      <header className="bg-gradient-to-b from-[#081525] via-[#0d2038] to-[#081525] text-white py-12 sm:py-16 border-b border-white/10 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(135,106,46,0.15),transparent_50%)] pointer-events-none" />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 relative z-10">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <button
              onClick={() => setCurrentView ? setCurrentView('home') : (window.location.href = '/')}
              className="inline-flex items-center gap-2 text-xs font-semibold text-gray-300 hover:text-white bg-white/10 hover:bg-white/15 px-3.5 py-1.5 rounded-full backdrop-blur transition-all"
            >
              <ArrowLeft size={14} /> Back to Home
            </button>
            <div className="flex items-center gap-2 text-xs text-[#D5C292]">
              <Scale size={16} />
              <span>Public Policy Document</span>
            </div>
          </div>

          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs uppercase tracking-widest font-bold text-[#876A2E] bg-[#876A2E]/10 px-2.5 py-1 rounded border border-[#876A2E]/30">
              Mehanda Army Investments
            </span>
            <BrandVerificationBadge className="h-4 w-4" />
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white mb-3">
            Terms & Conditions
          </h1>
          <p className="text-xs sm:text-sm text-gray-300 max-w-2xl leading-relaxed">
            These Terms & Conditions define the engagement framework, user responsibilities, and regulatory standards for clients and visitors of Mehanda Army Investments.
          </p>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 py-10 sm:py-14">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-6">

          {/* Core Terms Articles */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 sm:p-10 space-y-8">

            {/* Section 1 */}
            <section className="space-y-3 pb-6 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-xl bg-[#081525] text-amber-300 font-bold text-sm flex items-center justify-center shrink-0">
                  1
                </span>
                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  Scope of Engagement
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed pl-11">
                <strong>Mehanda Army Investments</strong> provides strategic portfolio planning, multi-asset allocation blueprinting, and wealth advisory services. Digital portal access does not constitute an execution mandate until formal client KYC and agreement documents are finalized.
              </p>
            </section>

            {/* Section 2 */}
            <section className="space-y-3 pb-6 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-xl bg-[#081525] text-amber-300 font-bold text-sm flex items-center justify-center shrink-0">
                  2
                </span>
                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  User Obligations
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed pl-11">
                Clients are responsible for maintaining the confidentiality of their portal credentials and ensuring accurate personal details are provided.
              </p>
            </section>

            {/* Section 3 */}
            <section className="space-y-3 pb-6 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-xl bg-[#081525] text-amber-300 font-bold text-sm flex items-center justify-center shrink-0">
                  3
                </span>
                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  Regulatory Compliance
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed pl-11">
                All investment allocations are executed through authorized, regulated financial institutions in accordance with prevailing Indian laws.
              </p>
            </section>

            {/* Section 4: Risk Disclosure */}
            <section className="space-y-3 pb-6 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-xl bg-[#876A2E] text-white font-bold text-sm flex items-center justify-center shrink-0">
                  4
                </span>
                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  Statutory Risk & Market Disclosure
                </h2>
              </div>
              <div className="ml-11 space-y-3 text-xs sm:text-sm text-slate-700 leading-relaxed">
                <p>
                  <strong>1. Market Volatility:</strong> Investments in equities, mutual funds, debt, and market-linked instruments are subject to economic, political, and market fluctuations. Returns are never fixed or guaranteed.
                </p>
                <p>
                  <strong>2. Capital Loss Risk:</strong> Investors must acknowledge the possibility of capital depreciation during market downturns.
                </p>
                <p>
                  <strong>3. No Profit Guarantees:</strong> Any figures, benchmarks, or compounding calculators displayed on this website represent mathematical estimates and historical illustrative metrics, not commitments of future gains. Securities markets, mutual funds, and market-linked products are subject to market risks. Read all scheme related documents carefully before investing. Past performance does not guarantee future results.
                </p>
              </div>
            </section>

            {/* Section 5: Grievance Desk */}
            <section className="space-y-3 pt-2">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-xl bg-[#50745A] text-white font-bold text-sm flex items-center justify-center shrink-0">
                  5
                </span>
                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  Grievance Redressal Desk
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed pl-11">
                Clients experiencing service issues or seeking clarification may contact our designated grievance team:
              </p>
              <div className="ml-11 bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-2 text-xs sm:text-sm text-slate-800">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <span className="text-slate-500 block text-[11px] uppercase tracking-wider font-semibold">Entity</span>
                    <strong className="text-slate-900">Mehanda Army Investments</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px] uppercase tracking-wider font-semibold">Response Turnaround</span>
                    <strong className="text-slate-900">Within 48 business hours</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px] uppercase tracking-wider font-semibold">Direct Phone</span>
                    <a href={`tel:${OFFICIAL_PHONE.replace(/\s+/g, '')}`} className="text-[#876A2E] hover:underline font-bold inline-flex items-center gap-1.5">
                      <Phone size={13} /> {OFFICIAL_PHONE}
                    </a>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px] uppercase tracking-wider font-semibold">Official Email</span>
                    <a href={`mailto:${OFFICIAL_EMAIL}`} className="text-[#50745A] hover:underline font-bold inline-flex items-center gap-1.5">
                      <Mail size={13} /> {OFFICIAL_EMAIL}
                    </a>
                  </div>
                </div>
              </div>
            </section>

            {/* Section 6: Intermediary & Non-Affiliation Declaration */}
            <section className="space-y-3 pt-6 border-t border-slate-100">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-xl bg-slate-800 text-white font-bold text-sm flex items-center justify-center shrink-0">
                  6
                </span>
                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  Intermediary Status &amp; Non-Affiliation Notice
                </h2>
              </div>
              <div className="ml-11 space-y-2.5 text-xs sm:text-sm text-slate-700 leading-relaxed">
                <p>
                  <strong>Digital Loan Sourcing &amp; Facilitation Intermediary:</strong> Mehanda Army Investments operates solely as an independent financial consultancy and digital loan facilitation platform (DSA / Lead Referral channel). We are not a Bank or NBFC and do not advance credit or disburse loans directly from our own funds. All loans, credit approvals, interest rates, and loan disbursements are executed exclusively by government &amp; RBI-registered banks, NBFCs, and authorized lending institutions.
                </p>
                <p>
                  <strong>Trade Name &amp; Non-Affiliation Notice:</strong> The trade name &ldquo;Mehanda Army Investments&rdquo; is an independent private commercial trade name. This platform is not affiliated with, sponsored by, or an official agency of the Ministry of Defence, Indian Armed Forces, or the Government of India.
                </p>
                <p>
                  <strong>Zero Advance Fee Guarantee:</strong> We never charge or demand any upfront loan approval fee, file processing cash in personal accounts, or security deposits.
                </p>
              </div>
            </section>

          </div>

          {/* Cross-Link Card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Review Data Protection Policies</h3>
              <p className="text-xs text-slate-600">Learn how your submitted information is kept safe and confidential.</p>
            </div>
            <a
              href="/privacy-policy"
              onClick={(e) => {
                e.preventDefault();
                if (setCurrentView) setCurrentView('privacy-policy');
                else window.location.href = '/privacy-policy';
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#081525] hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors"
            >
              <ShieldCheck size={14} /> View Privacy Policy
            </a>
          </div>

        </div>
      </main>

      {/* Official Footer */}
      <Footer
        scrollTo={scrollTo}
        openLegalModal={openLegalModal}
        setCurrentView={setCurrentView}
      />
    </div>
  );
}

