import React from 'react';
import { PieChart, TrendingUp, ShieldAlert, ArrowRight, CheckCircle2, Layers } from 'lucide-react';

export default function Services({ scrollTo, setCurrentView }) {
  const services = [
    {
      title: "Portfolio Planning & Multi-Asset Allocation",
      desc: "Systematic asset diversification across large-cap equities, high-grade debt instruments, gold hedges, and liquid reserves tailored to your specific time horizon.",
      icon: <PieChart size={28} className="text-[#FF851B]" />,
      features: [
        "Personalized risk capacity assessment",
        "Asset correlation analysis to minimize volatility",
        "Disciplined periodic rebalancing schedule"
      ],
      tag: "Asset Architecture"
    },
    {
      title: "Retirement & Generational Wealth Blueprinting",
      desc: "Structured, compounding wealth blueprints engineered for long-term cash-flow needs, pension security, and inflation-protected wealth preservation.",
      icon: <TrendingUp size={28} className="text-[#00C995]" />,
      features: [
        "Systematic Investment Plan (SIP) modeling",
        "Tax-advantaged asset structuring",
        "Emergency buffer and liquidity preservation"
      ],
      tag: "Long-Term Security"
    },
    {
      title: "Capital Preservation & Downside Risk Hedging",
      desc: "Stress-tested allocations designed to mitigate severe market drawdowns and protect core capital during turbulent economic cycles.",
      icon: <ShieldAlert size={28} className="text-[#10243B]" />,
      features: [
        "Maximum drawdown containment protocols",
        "Sovereign-backed fixed income integration",
        "Zero exposure to speculative leveraged instruments"
      ],
      tag: "Capital Guard"
    }
  ];

  return (
    <section id="services" className="py-20 md:py-28 bg-white border-y border-gray-200/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="max-w-3xl mx-auto text-center mb-16">
          <span className="text-xs font-bold uppercase tracking-widest text-[#00C995] block mb-2">
            Disciplined Wealth Solutions
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#081525] tracking-tight">
            Our Core Strategic Services
          </h2>
          <div className="w-16 h-1 bg-[#FF851B] mx-auto mt-4 rounded-full"></div>
          <p className="mt-4 text-base text-gray-600 leading-relaxed font-normal">
            We provide structured, institutional-caliber investment blueprints. All client capital is deployed directly into authorized, regulated financial vehicles in the client's own name.
          </p>
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {services.map((item, index) => (
            <div 
              key={index} 
              className="bg-[#F4F7FA] rounded-2xl p-8 border border-gray-200/80 hover:border-[#00C995]/40 hover:shadow-xl transition-all duration-300 flex flex-col justify-between group"
            >
              <div>
                <div className="flex justify-between items-start mb-6">
                  <div className="w-14 h-14 bg-white rounded-xl flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                    {item.icon}
                  </div>
                  <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider bg-white px-3 py-1 rounded-full border border-gray-200">
                    {item.tag}
                  </span>
                </div>

                <h3 className="text-xl font-bold text-[#081525] mb-3 leading-snug">
                  {item.title}
                </h3>

                <p className="text-sm text-gray-600 leading-relaxed mb-6 font-normal">
                  {item.desc}
                </p>

                <div className="space-y-2.5 pt-4 border-t border-gray-200/70 mb-6">
                  {item.features.map((feat, fIdx) => (
                    <div key={fIdx} className="flex items-start gap-2 text-xs text-gray-700">
                      <CheckCircle2 size={15} className="text-[#00C995] flex-shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200/60 flex items-center justify-between">
                <button 
                  onClick={() => scrollTo('#contact')}
                  className="text-xs font-bold text-[#FF851B] hover:text-orange-700 flex items-center gap-1.5 transition-colors group-hover:gap-2.5"
                >
                  Schedule Consultation <ArrowRight size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Notice on Custodial Integrity */}
        <div className="mt-12 p-4 bg-[#10243B]/5 border border-[#10243B]/15 rounded-xl text-xs text-gray-600 text-center max-w-4xl mx-auto leading-relaxed">
          <strong className="text-[#081525] font-semibold">Custody Disclosure:</strong> Mehanda Army Investments does not take custody of banking balances. Client transactions are settled directly via accredited clearing corporations, asset management companies, and official depository participants.
        </div>

      </div>
    </section>
  );
}
