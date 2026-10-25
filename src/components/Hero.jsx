import React from 'react';
import { ArrowRight, PlayCircle, Lock, ShieldCheck, TrendingUp, BarChart3, PieChart, Layers } from 'lucide-react';

export default function Hero({ setCurrentView, scrollTo }) {
  return (
    <section id="hero" className="relative bg-gradient-to-b from-[#081525] via-[#10243B] to-[#081525] text-white pt-16 pb-24 md:pt-24 md:pb-32 overflow-hidden">
      {/* Background radial glows */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-[#00C995] opacity-10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-10 left-10 w-96 h-96 bg-[#FF851B] opacity-10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Column: Headline and Call-to-actions */}
          <div className="lg:col-span-7 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 py-1.5 px-3.5 rounded-full bg-white/5 border border-white/10 text-[#00C995] text-xs font-semibold mb-6">
              <ShieldCheck size={15} />
              <span>Disciplined Wealth Management & Portfolio Planning</span>
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight mb-6">
              A More Disciplined Approach to Your{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF851B] via-amber-400 to-[#00C995]">
                Financial Future.
              </span>
            </h1>

            <p className="text-base sm:text-lg text-gray-300 max-w-2xl mx-auto lg:mx-0 mb-8 leading-relaxed font-normal">
              Structured multi-asset portfolio planning and capital preservation tailored for defense veterans, working professionals, and forward-looking families. Real strategies engineered without speculative hype.
            </p>

            {/* Main Action CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
              <button 
                onClick={() => setCurrentView('demo-dashboard')}
                className="w-full sm:w-auto px-7 py-3.5 bg-[#FF851B] hover:bg-orange-600 text-white font-bold rounded-xl shadow-lg shadow-orange-500/25 transition-all flex items-center justify-center gap-2 text-sm group active:scale-95"
              >
                <PlayCircle size={18} />
                Explore Demo Portfolio
                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </button>

              <button 
                onClick={() => setCurrentView('auth-login')}
                className="w-full sm:w-auto px-7 py-3.5 bg-white/10 hover:bg-white/15 border border-white/15 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 text-sm backdrop-blur-sm active:scale-95"
              >
                <Lock size={16} className="text-[#00C995]" />
                Client Login
              </button>
            </div>

            {/* Feature Checkpoints */}
            <div className="mt-10 pt-6 border-t border-white/10 grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs text-gray-400 text-left">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00C995]"></span>
                Zero Speculative Hype
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#FF851B]"></span>
                Regulated Custody
              </div>
              <div className="flex items-center gap-2 col-span-2 sm:col-span-1">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                Objective Risk Hedging
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Financial Preview Card */}
          <div className="lg:col-span-5">
            <div className="bg-[#10243B]/80 backdrop-blur-xl border border-white/15 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
              {/* Badge */}
              <div className="flex justify-between items-center pb-4 mb-4 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-400/80"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-400/80"></div>
                  <div className="w-3 h-3 rounded-full bg-[#00C995]"></div>
                  <span className="text-xs font-mono text-gray-400 ml-1">Asset Allocation Architecture</span>
                </div>
                <span className="text-[10px] uppercase font-bold text-[#FF851B] bg-[#FF851B]/15 px-2.5 py-0.5 rounded-full border border-[#FF851B]/30">
                  Illustrative Model
                </span>
              </div>

              {/* Sample Blueprint Metric */}
              <div className="bg-[#081525] p-4 rounded-2xl border border-white/10 mb-5">
                <span className="text-xs text-gray-400 block">Target Diversification Framework</span>
                <div className="flex justify-between items-baseline mt-1">
                  <span className="text-2xl font-black text-white">Multi-Asset Growth</span>
                  <span className="text-xs font-bold text-[#00C995] bg-[#00C995]/15 px-2 py-0.5 rounded-md">
                    Low Volatility Focus
                  </span>
                </div>
              </div>

              {/* Visual Asset Allocation Bar */}
              <div className="space-y-3 mb-6">
                <div>
                  <div className="flex justify-between text-xs font-medium text-gray-300 mb-1">
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#FF851B]"></span> Equities (Growth Engine)</span>
                    <span className="font-mono text-white">45%</span>
                  </div>
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div className="bg-[#FF851B] h-full" style={{ width: '45%' }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-medium text-gray-300 mb-1">
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#00C995]"></span> Debt & Sovereign Sec (Preservation)</span>
                    <span className="font-mono text-white">30%</span>
                  </div>
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div className="bg-[#00C995] h-full" style={{ width: '30%' }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-medium text-gray-300 mb-1">
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span> Gold / Precious Metals (Inflation Hedge)</span>
                    <span className="font-mono text-white">15%</span>
                  </div>
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div className="bg-amber-400 h-full" style={{ width: '15%' }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-medium text-gray-300 mb-1">
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-400"></span> Liquid Cash Reserve (Liquidity)</span>
                    <span className="font-mono text-white">10%</span>
                  </div>
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div className="bg-blue-400 h-full" style={{ width: '10%' }}></div>
                  </div>
                </div>
              </div>

              {/* Demo Launcher Button */}
              <button 
                onClick={() => setCurrentView('demo-dashboard')}
                className="w-full py-2.5 bg-gradient-to-r from-[#00C995] to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-md"
              >
                <PlayCircle size={15} />
                Open Interactive Demo Dashboard
              </button>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
