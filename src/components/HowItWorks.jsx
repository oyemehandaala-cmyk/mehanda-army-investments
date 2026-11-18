import React from 'react';
import { MessageSquare, FileCheck2, Building2, BarChart2, CheckCircle2, ArrowRight } from 'lucide-react';

export default function HowItWorks() {
  const steps = [
    {
      num: "01",
      title: "Choose Financial Solution",
      desc: "Select from Student Education Loan, Dairy Farming, Sheep Farming, Goat Farming, or Strategic Multi-Asset Wealth Investments based on your requirements.",
      icon: <MessageSquare size={22} className="text-blue-600" />,
      color: "bg-blue-50 text-blue-700 border-blue-200",
    },
    {
      num: "02",
      title: "100% Digital KYC & Form",
      desc: "Submit basic personal details, Aadhaar, PAN, and purpose of loan or investment through our secure paperless portal with live tracking ID generation.",
      icon: <FileCheck2 size={22} className="text-emerald-600" />,
      color: "bg-emerald-50 text-emerald-700 border-emerald-200",
    },
    {
      num: "03",
      title: "Fast Verification & Sanction",
      desc: "Our facilitation team coordinates documentation readiness with RBI-registered institutional partner lenders for prompt pre-assessment.",
      icon: <Building2 size={22} className="text-indigo-600" />,
      color: "bg-indigo-50 text-indigo-700 border-indigo-200",
    },
    {
      num: "04",
      title: "Direct Bank Disbursal",
      desc: "Upon partner lender sanction approval, funds are disbursed directly by the bank/NBFC into your verified bank account.",
      icon: <BarChart2 size={22} className="text-amber-600" />,
      color: "bg-amber-50 text-amber-700 border-amber-200",
    }
  ];

  return (
    <section id="process" className="relative py-12 sm:py-16 md:py-24 bg-slate-50 text-slate-900 border-b border-slate-200/90 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="max-w-3xl mx-auto text-center mb-12">
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full border border-blue-200 bg-blue-50 text-xs font-bold uppercase tracking-wider text-blue-700 mb-3 shadow-xs">
            ★ Simple & Transparent Process
          </span>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight">
            How It Works — In 4 Easy Steps
          </h2>
          <div className="w-16 h-1 bg-blue-600 mx-auto mt-3 rounded-full"></div>
          <p className="mt-3 text-sm sm:text-base text-slate-600 leading-relaxed font-normal">
            A frictionless, 100% paperless financial journey designed to get you sanctioned and funded quickly without visiting multiple offices.
          </p>
        </div>

        {/* Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step, idx) => (
            <div 
              key={idx} 
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs hover:shadow-md hover:border-blue-400 hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-center mb-4">
                  <div className={`w-11 h-11 rounded-xl border flex items-center justify-center ${step.color} shadow-xs`}>
                    {step.icon}
                  </div>
                  <span className="text-2xl font-black text-slate-300 font-mono">
                    {step.num}
                  </span>
                </div>

                <h3 className="text-base font-bold text-slate-900 mb-2 leading-snug">
                  {step.title}
                </h3>

                <p className="text-xs text-slate-600 leading-relaxed font-normal">
                  {step.desc}
                </p>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-100 flex items-center gap-1.5 text-[11px] font-bold text-blue-700">
                <CheckCircle2 size={13} className="text-emerald-600" />
                <span>Stage {step.num} Verified</span>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
