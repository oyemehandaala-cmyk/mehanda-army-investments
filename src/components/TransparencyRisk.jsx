import React from 'react';
import { AlertTriangle, ShieldCheck, Scale, FileText } from 'lucide-react';

export default function TransparencyRisk({ openLegalModal, setCurrentView }) {
  return (
    <section className="py-12 bg-slate-100 text-slate-800 border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm">
          <div className="flex flex-col md:flex-row items-start gap-5">
            <div className="w-12 h-12 bg-amber-50 text-amber-700 rounded-xl flex items-center justify-center shrink-0 border border-amber-200 shadow-xs">
              <AlertTriangle size={24} />
            </div>

            <div className="flex-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 block mb-1">
                Statutory & Risk Disclosures
              </span>
              <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-2">
                Commitment to Transparent Lending & Investing
              </h3>
              
              <div className="space-y-2.5 text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
                <p>
                  <strong>Digital Loan Facilitator & Referral Desk:</strong> Mehanda Army Investments operates strictly as a loan facilitation and financial consultancy intermediary (DSA / Lead Referral Partner). We are <strong>NOT a Bank or NBFC</strong> and do not provide direct loans or credit from our own balance sheet. All loan facilities, underwriting, approvals, interest rates, and disbursements are executed exclusively by government & RBI-registered banks, NBFCs, and authorized institutional lenders.
                </p>
                <p>
                  <strong>No Upfront Advance Fees:</strong> We never charge or demand any upfront loan approval fee, file processing fees in personal accounts, or security deposits. Beware of fraudsters posing as lending officers.
                </p>
                <p>
                  <strong>Market Risks:</strong> Investments in equities, mutual funds, debt securities, and market-linked instruments are subject to market risks, including the potential fluctuation or loss of principal capital. Past performance or illustrative historical index benchmarks do not guarantee future returns.
                </p>
                <p>
                  <strong>No Guaranteed Profit Claims:</strong> Mehanda Army Investments does not promise, guarantee, or assure fixed returns or risk-free appreciation under any circumstances. All estimates displayed on this platform are mathematical illustrations only.
                </p>
                <p>
                  <strong>Independent Decision Making:</strong> Prospective clients must independently evaluate loan eligibility terms, scheme information documents, risk factors, and their personal financial situation before committing capital or executing loan agreements.
                </p>
              </div>

              <div className="mt-5 pt-3.5 border-t border-slate-100 flex flex-wrap gap-4 text-xs font-semibold">
                <button 
                  onClick={() => openLegalModal('Risk Disclosure')}
                  className="text-blue-700 hover:text-blue-800 underline underline-offset-4 flex items-center gap-1.5 cursor-pointer"
                >
                  <FileText size={14} /> Full Risk Disclosure Policy
                </button>
                <a 
                  href="/terms-and-conditions"
                  onClick={(e) => {
                    e.preventDefault();
                    if (setCurrentView) setCurrentView('terms-and-conditions');
                    else window.location.href = '/terms-and-conditions';
                  }}
                  className="text-slate-600 hover:text-slate-900 underline underline-offset-4 flex items-center gap-1.5"
                >
                  <Scale size={14} /> Client Terms & Conditions
                </a>
                <a 
                  href="/privacy-policy"
                  onClick={(e) => {
                    e.preventDefault();
                    if (setCurrentView) setCurrentView('privacy-policy');
                    else window.location.href = '/privacy-policy';
                  }}
                  className="text-slate-600 hover:text-slate-900 underline underline-offset-4 flex items-center gap-1.5"
                >
                  <ShieldCheck size={14} /> Data Privacy Standard
                </a>
              </div>

            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
