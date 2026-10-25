import React from 'react';
import { AlertTriangle, ShieldCheck, Scale, FileText } from 'lucide-react';

export default function TransparencyRisk({ openLegalModal }) {
  return (
    <section className="py-16 bg-[#10243B] text-gray-300 border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="bg-[#081525] rounded-3xl p-8 sm:p-10 border border-white/10 shadow-xl">
          <div className="flex flex-col md:flex-row items-start gap-6">
            <div className="w-14 h-14 bg-amber-500/10 text-amber-400 rounded-2xl flex items-center justify-center flex-shrink-0 border border-amber-500/20">
              <AlertTriangle size={28} />
            </div>

            <div className="flex-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 block mb-1">
                Statutory & Risk Disclosures
              </span>
              <h3 className="text-xl sm:text-2xl font-bold text-white mb-3">
                Commitment to Transparent Investing
              </h3>
              
              <div className="space-y-3 text-xs sm:text-sm text-gray-300 leading-relaxed font-normal">
                <p>
                  <strong>Market Risks:</strong> Investments in equities, mutual funds, debt securities, and market-linked instruments are subject to market risks, including the potential fluctuation or loss of principal capital. Past performance or illustrative historical index benchmarks do not guarantee future returns.
                </p>
                <p>
                  <strong>No Guaranteed Profit Claims:</strong> Mehanda Army Investments does not promise, guarantee, or assure fixed returns or risk-free appreciation under any circumstances. All estimates displayed on this platform are mathematical illustrations only.
                </p>
                <p>
                  <strong>Independent Decision Making:</strong> Prospective clients must independently evaluate scheme information documents, risk factors, and their personal financial situation before committing capital.
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-white/10 flex flex-wrap gap-4 text-xs font-semibold">
                <button 
                  onClick={() => openLegalModal('Risk Disclosure')}
                  className="text-[#00C995] hover:text-emerald-400 underline underline-offset-4 flex items-center gap-1.5"
                >
                  <FileText size={14} /> Full Risk Disclosure Policy
                </button>
                <button 
                  onClick={() => openLegalModal('Terms & Conditions')}
                  className="text-gray-400 hover:text-white underline underline-offset-4 flex items-center gap-1.5"
                >
                  <Scale size={14} /> Client Terms & Conditions
                </button>
                <button 
                  onClick={() => openLegalModal('Privacy Policy')}
                  className="text-gray-400 hover:text-white underline underline-offset-4 flex items-center gap-1.5"
                >
                  <ShieldCheck size={14} /> Data Privacy Standard
                </button>
              </div>

            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
