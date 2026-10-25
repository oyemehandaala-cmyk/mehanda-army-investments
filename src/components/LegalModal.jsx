import React from 'react';
import { X, ShieldAlert, FileText, Scale } from 'lucide-react';

export default function LegalModal({ title, isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden border border-gray-200">
        
        {/* Modal Header */}
        <div className="p-6 bg-[#081525] text-white flex justify-between items-center border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <FileText size={20} className="text-[#FF851B]" />
            <h3 className="text-lg font-bold text-white">{title}</h3>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 text-gray-300 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto text-xs sm:text-sm text-gray-600 space-y-4 leading-relaxed font-normal">
          {title === 'Privacy Policy' && (
            <>
              <p>
                <strong>1. Data Collection:</strong> Mehanda Army Investments collects personal contact details (such as your full name, phone number, and email) solely when voluntarily submitted through our inquiry or account creation forms.
              </p>
              <p>
                <strong>2. Usage of Information:</strong> Submitted information is used strictly to respond to specific financial consultations, maintain client accounts, and provide agreed portfolio planning updates.
              </p>
              <p>
                <strong>3. No Third-Party Sales:</strong> We do not sell, rent, or trade client personal information to third-party telemarketers or external advertising networks.
              </p>
              <p>
                <strong>4. Security Protocols:</strong> Sensitive records are protected using standard 256-bit encryption and access-controlled databases.
              </p>
            </>
          )}

          {title === 'Terms & Conditions' && (
            <>
              <p>
                <strong>1. Scope of Engagement:</strong> Mehanda Army Investments provides strategic portfolio planning, multi-asset allocation blueprinting, and wealth advisory services. Digital portal access does not constitute an execution mandate until formal client KYC and agreement documents are finalized.
              </p>
              <p>
                <strong>2. User Obligations:</strong> Clients are responsible for maintaining the confidentiality of their portal credentials and ensuring accurate personal details are provided.
              </p>
              <p>
                <strong>3. Regulatory Compliance:</strong> All investment allocations are executed through authorized, regulated financial institutions in accordance with prevailing Indian laws.
              </p>
            </>
          )}

          {title === 'Risk Disclosure' && (
            <>
              <p>
                <strong>1. Market Volatility:</strong> Investments in equities, mutual funds, debt, and market-linked instruments are subject to economic, political, and market fluctuations. Returns are never fixed or guaranteed.
              </p>
              <p>
                <strong>2. Capital Loss Risk:</strong> Investors must acknowledge the possibility of capital depreciation during market downturns.
              </p>
              <p>
                <strong>3. No Profit Guarantees:</strong> Any figures, benchmarks, or compounding calculators displayed on this website represent mathematical estimates and historical illustrative metrics, not commitments of future gains.
              </p>
            </>
          )}

          {title === 'Grievance Officer' && (
            <>
              <p>
                <strong>Grievance Redressal Desk:</strong> Clients experiencing service issues or seeking clarification may contact our designated grievance team:
              </p>
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-1 text-xs text-gray-800">
                <p><strong>Entity:</strong> Mehanda Army Investments</p>
                <p><strong>Direct Phone:</strong> +91 9812947813</p>
                <p><strong>Official Email:</strong> Info@mehandaarmy.in</p>
                <p><strong>Response Turnaround:</strong> Within 48 business hours</p>
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end">
          <button 
            onClick={onClose} 
            className="px-5 py-2.5 bg-[#081525] hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-colors"
          >
            I Understand & Close
          </button>
        </div>

      </div>
    </div>
  );
}
