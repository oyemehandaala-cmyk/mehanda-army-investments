import React from 'react';
import { PlayCircle, ShieldCheck, ArrowRight, BarChart3, PieChart, Layers, RefreshCw } from 'lucide-react';
import { INITIAL_DEMO_PORTFOLIO } from '../data/demoPortfolio';

export default function DemoPortfolioPreview({ setCurrentView }) {
  const formatINR = (val) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
  };

  return (
    <section id="demo-preview" className="py-16 md:py-24 bg-white text-slate-900 border-b border-slate-200 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="max-w-3xl mx-auto text-center mb-12">
          <div className="inline-flex items-center gap-2 py-1 px-3.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold uppercase tracking-wider mb-3 shadow-xs">
            <PlayCircle size={14} /> Interactive Experience
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight">
            Explore Our Portfolio Architecture
          </h2>
          <div className="w-16 h-1 bg-blue-600 mx-auto mt-3 rounded-full"></div>
          <p className="mt-3 text-sm sm:text-base text-slate-600 leading-relaxed font-normal">
            Take a test drive of our portfolio monitoring interface without creating an account or providing sensitive credentials.
          </p>
        </div>

        {/* Demo Dashboard Card Container */}
        <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6 sm:p-10 shadow-lg max-w-5xl mx-auto">
          
          {/* Prominent Demo Notice Bar */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="px-2.5 py-1 rounded-md bg-amber-500 text-slate-950 font-black text-[11px] uppercase tracking-wider">
                DEMO — ILLUSTRATIVE DATA ONLY
              </span>
              <p className="text-xs text-amber-900 leading-tight">
                Simulated sample data for demonstration. Does not represent actual customer capital or guaranteed yield.
              </p>
            </div>
            <button 
              onClick={() => setCurrentView('demo-dashboard')}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-colors flex items-center gap-1.5 shadow-xs whitespace-nowrap self-stretch sm:self-auto justify-center cursor-pointer"
            >
              <PlayCircle size={14} /> Launch Full Demo Portal
            </button>
          </div>

          {/* Sample Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-xs text-slate-500 block font-medium">Sample Portfolio Value</span>
              <span className="text-2xl font-black text-slate-900 mt-1 block">
                {formatINR(INITIAL_DEMO_PORTFOLIO.totalValue)}
              </span>
              <span className="text-xs font-semibold text-emerald-600 mt-1 inline-block">
                +{INITIAL_DEMO_PORTFOLIO.unrealizedReturnPercentage}% (Illustrative)
              </span>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-xs text-slate-500 block font-medium">Invested Principal</span>
              <span className="text-2xl font-black text-slate-900 mt-1 block">
                {formatINR(INITIAL_DEMO_PORTFOLIO.initialCapital)}
              </span>
              <span className="text-xs text-slate-500 mt-1 inline-block">Net Cost Basis</span>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-xs text-slate-500 block font-medium">Monthly Blueprint SIP</span>
              <span className="text-2xl font-black text-blue-700 mt-1 block">
                {formatINR(INITIAL_DEMO_PORTFOLIO.monthlySipAmount)}
              </span>
              <span className="text-xs text-slate-500 mt-1 inline-block">Disciplined Allocation</span>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-xs text-slate-500 block font-medium">Risk Framework</span>
              <span className="text-lg font-bold text-amber-700 mt-1.5 block">
                Balanced Multi-Asset
              </span>
              <span className="text-xs text-slate-500 mt-1 inline-block">Dynamic Allocation</span>
            </div>
          </div>

          {/* Asset Allocation Breakdown preview */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 mb-6 shadow-xs">
            <div className="flex justify-between items-center mb-5 pb-3 border-b border-slate-100">
              <h4 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                <PieChart size={16} className="text-blue-600" /> Multi-Asset Allocation Strategy
              </h4>
              <span className="text-xs text-slate-500">Target Diversification</span>
            </div>

            <div className="space-y-4">
              {INITIAL_DEMO_PORTFOLIO.allocation.map((item, idx) => (
                <div key={idx}>
                  <div className="flex justify-between text-xs font-semibold mb-1.5">
                    <span className="text-slate-700 flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></span>
                      {item.name}
                    </span>
                    <span className="font-mono text-slate-900 font-bold">
                      {item.percentage}% ({formatINR(item.value)})
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
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
              className="px-8 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md text-sm transition-all inline-flex items-center gap-2 active:scale-95 cursor-pointer"
            >
              <PlayCircle size={18} />
              Open Full Interactive Demo Dashboard (Zero Signup)
              <ArrowRight size={16} />
            </button>
            <p className="text-[11px] text-slate-500 mt-2.5">
              No phone numbers, passwords, or registration required to view the interactive demo.
            </p>
          </div>

        </div>
      </div>
    </section>
  );
}
