import React from 'react';
import { PlayCircle, ShieldCheck, ArrowRight, BarChart3, PieChart, Layers, RefreshCw } from 'lucide-react';
import { INITIAL_DEMO_PORTFOLIO } from '../data/demoPortfolio';

export default function DemoPortfolioPreview({ setCurrentView }) {
  const formatINR = (val) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
  };

  return (
    <section id="demo-preview" className="py-20 md:py-28 bg-[#081525] text-white relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/2 left-0 w-96 h-96 bg-[#00C995] opacity-5 rounded-full blur-3xl pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="max-w-3xl mx-auto text-center mb-16">
          <div className="inline-flex items-center gap-2 py-1 px-3.5 rounded-full bg-[#00C995]/15 border border-[#00C995]/30 text-[#00C995] text-xs font-bold uppercase tracking-widest mb-3">
            <PlayCircle size={14} /> Interactive Experience
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Explore Our Portfolio Architecture
          </h2>
          <div className="w-16 h-1 bg-[#FF851B] mx-auto mt-4 rounded-full"></div>
          <p className="mt-4 text-sm sm:text-base text-gray-300 leading-relaxed font-normal">
            Take a test drive of our portfolio monitoring interface without creating an account or providing sensitive credentials.
          </p>
        </div>

        {/* Demo Dashboard Card Container */}
        <div className="bg-[#10243B] rounded-3xl border border-white/15 p-6 sm:p-10 shadow-2xl max-w-5xl mx-auto">
          
          {/* Prominent Demo Notice Bar */}
          <div className="bg-amber-500/15 border border-amber-500/30 rounded-2xl p-4 mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="px-2.5 py-1 rounded-md bg-amber-500 text-slate-950 font-black text-[11px] uppercase tracking-wider">
                DEMO — ILLUSTRATIVE DATA ONLY
              </span>
              <p className="text-xs text-amber-200/90 leading-tight">
                Simulated sample data for demonstration. Does not represent actual customer capital or guaranteed yield.
              </p>
            </div>
            <button 
              onClick={() => setCurrentView('demo-dashboard')}
              className="px-4 py-2 bg-[#00C995] hover:bg-emerald-600 text-slate-950 font-bold rounded-xl text-xs transition-colors flex items-center gap-1.5 shadow-sm whitespace-nowrap self-stretch sm:self-auto justify-center"
            >
              <PlayCircle size={14} /> Launch Full Demo Portal
            </button>
          </div>

          {/* Sample Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-[#081525] p-5 rounded-2xl border border-white/10">
              <span className="text-xs text-gray-400 block font-medium">Sample Portfolio Value</span>
              <span className="text-2xl font-black text-white mt-1 block">
                {formatINR(INITIAL_DEMO_PORTFOLIO.totalValue)}
              </span>
              <span className="text-xs font-semibold text-[#00C995] mt-1 inline-block">
                +{INITIAL_DEMO_PORTFOLIO.unrealizedReturnPercentage}% (Illustrative)
              </span>
            </div>

            <div className="bg-[#081525] p-5 rounded-2xl border border-white/10">
              <span className="text-xs text-gray-400 block font-medium">Invested Principal</span>
              <span className="text-2xl font-black text-white mt-1 block">
                {formatINR(INITIAL_DEMO_PORTFOLIO.initialCapital)}
              </span>
              <span className="text-xs text-gray-400 mt-1 inline-block">Net Cost Basis</span>
            </div>

            <div className="bg-[#081525] p-5 rounded-2xl border border-white/10">
              <span className="text-xs text-gray-400 block font-medium">Monthly Blueprint SIP</span>
              <span className="text-2xl font-black text-[#FF851B] mt-1 block">
                {formatINR(INITIAL_DEMO_PORTFOLIO.monthlySipAmount)}
              </span>
              <span className="text-xs text-gray-400 mt-1 inline-block">Disciplined Allocation</span>
            </div>

            <div className="bg-[#081525] p-5 rounded-2xl border border-white/10">
              <span className="text-xs text-gray-400 block font-medium">Risk Framework</span>
              <span className="text-lg font-bold text-amber-400 mt-1.5 block">
                Balanced Multi-Asset
              </span>
              <span className="text-xs text-gray-400 mt-1 inline-block">Dynamic Allocation</span>
            </div>
          </div>

          {/* Asset Allocation Breakdown preview */}
          <div className="bg-[#081525] p-6 rounded-2xl border border-white/10 mb-8">
            <div className="flex justify-between items-center mb-5 pb-3 border-b border-white/10">
              <h4 className="text-sm font-bold uppercase tracking-wider text-gray-300 flex items-center gap-2">
                <PieChart size={16} className="text-[#FF851B]" /> Multi-Asset Allocation Strategy
              </h4>
              <span className="text-xs text-gray-400">Target Diversification</span>
            </div>

            <div className="space-y-4">
              {INITIAL_DEMO_PORTFOLIO.allocation.map((item, idx) => (
                <div key={idx}>
                  <div className="flex justify-between text-xs font-semibold mb-1.5">
                    <span className="text-gray-300 flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></span>
                      {item.name}
                    </span>
                    <span className="font-mono text-white">
                      {item.percentage}% ({formatINR(item.value)})
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${item.percentage}%`, backgroundColor: item.color }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Full Demo Launcher CTA */}
          <div className="text-center pt-2">
            <button 
              onClick={() => setCurrentView('demo-dashboard')}
              className="px-8 py-3.5 bg-gradient-to-r from-[#FF851B] to-amber-500 hover:from-orange-600 hover:to-orange-700 text-white font-bold rounded-xl shadow-lg shadow-orange-500/20 text-sm transition-all inline-flex items-center gap-2 active:scale-95"
            >
              <PlayCircle size={18} />
              Open Full Interactive Demo Dashboard (Zero Signup)
              <ArrowRight size={16} />
            </button>
            <p className="text-[11px] text-gray-400 mt-3">
              No phone numbers, passwords, or registration required to view the interactive demo.
            </p>
          </div>

        </div>
      </div>
    </section>
  );
}
