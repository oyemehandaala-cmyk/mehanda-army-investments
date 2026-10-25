import React from 'react';
import { MessageSquare, FileCheck2, Building2, BarChart2 } from 'lucide-react';

export default function HowItWorks() {
  const steps = [
    {
      num: "01",
      title: "Confidential Consultation & Profiling",
      desc: "We discuss your financial horizon, recurring liquidity needs, tax requirements, and psychological risk tolerance. We never deploy a one-size-fits-all plan.",
      icon: <MessageSquare size={22} className="text-[#FF851B]" />
    },
    {
      num: "02",
      title: "Strategic Asset Blueprinting",
      desc: "Our team designs a mathematically disciplined portfolio allocation across uncorrelated asset classes to minimize portfolio drawdown risks.",
      icon: <FileCheck2 size={22} className="text-[#00C995]" />
    },
    {
      num: "03",
      title: "Secure Custodial Deployment",
      desc: "Your capital is deployed directly through accredited depository institutions and mutual fund clearing houses in your own legal name. Account registration is completely separate from capital allocation.",
      icon: <Building2 size={22} className="text-[#10243B]" />
    },
    {
      num: "04",
      title: "Active Governance & Rebalancing",
      desc: "We conduct periodic stress reviews and systematic rebalancing so your asset weights stay aligned with target parameters through shifting market cycles.",
      icon: <BarChart2 size={22} className="text-amber-500" />
    }
  ];

  return (
    <section id="process" className="py-20 md:py-28 bg-[#F4F7FA]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="max-w-3xl mx-auto text-center mb-16">
          <span className="text-xs font-bold uppercase tracking-widest text-[#FF851B] block mb-2">
            Clear, Disciplined Framework
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#081525] tracking-tight">
            How Client Onboarding Works
          </h2>
          <div className="w-16 h-1 bg-[#00C995] mx-auto mt-4 rounded-full"></div>
          <p className="mt-4 text-base text-gray-600 leading-relaxed font-normal">
            A transparent 4-stage process designed to protect your capital and establish a sustainable investment roadmap.
          </p>
        </div>

        {/* Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, idx) => (
            <div 
              key={idx} 
              className="bg-white p-7 rounded-2xl border border-gray-200/80 shadow-sm hover:shadow-md transition-shadow relative flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-center mb-5">
                  <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center border border-gray-100">
                    {step.icon}
                  </div>
                  <span className="text-2xl font-black text-gray-300 font-mono">
                    {step.num}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-[#081525] mb-2 leading-snug">
                  {step.title}
                </h3>

                <p className="text-xs sm:text-sm text-gray-600 leading-relaxed font-normal">
                  {step.desc}
                </p>
              </div>

              <div className="mt-6 pt-3 border-t border-gray-100 text-[11px] text-gray-400 font-semibold uppercase tracking-wider">
                Stage {idx + 1} of 4
              </div>
            </div>
          ))}
        </div>

        {/* Separation Notice */}
        <div className="mt-12 bg-white rounded-2xl p-6 border border-gray-200 text-xs text-gray-600 max-w-3xl mx-auto text-center leading-relaxed">
          <strong className="text-[#081525]">Important Note:</strong> Creating a digital account on our website gives you portal access. Actual investment deployment occurs only after completing formal risk assessment and signing official KYC/depository documentation.
        </div>

      </div>
    </section>
  );
}
