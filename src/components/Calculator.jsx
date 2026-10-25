import React, { useState } from 'react';
import { Calculator as CalcIcon, Sparkles, AlertCircle, ArrowRight } from 'lucide-react';

export default function Calculator({ scrollTo }) {
  const [initialLumpSum, setInitialLumpSum] = useState(50000);
  const [monthlySip, setMonthlySip] = useState(15000);
  const [years, setYears] = useState(10);
  const [cagrRate, setCagrRate] = useState(12.0);

  // Correct financial compounding calculation:
  // Future Value of Initial Lump sum: P * (1 + r)^t
  // Future Value of Monthly SIP: PMT * [((1 + i)^n - 1) / i] * (1 + i)
  const calculateProjections = () => {
    const r = cagrRate / 100;
    const i = r / 12;
    const n = years * 12;

    const lumpSumFV = initialLumpSum * Math.pow(1 + r, years);

    let sipFV = 0;
    if (monthlySip > 0 && i > 0) {
      sipFV = monthlySip * ((Math.pow(1 + i, n) - 1) / i) * (1 + i);
    }

    const totalInvested = initialLumpSum + (monthlySip * n);
    const totalCorpus = lumpSumFV + sipFV;
    const estimatedReturns = Math.max(0, totalCorpus - totalInvested);

    return {
      totalInvested: Math.round(totalInvested),
      estimatedReturns: Math.round(estimatedReturns),
      totalCorpus: Math.round(totalCorpus)
    };
  };

  const { totalInvested, estimatedReturns, totalCorpus } = calculateProjections();

  const formatINR = (val) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
  };

  return (
    <section id="calculator" className="py-20 md:py-28 bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Heading */}
        <div className="max-w-3xl mx-auto text-center mb-16">
          <span className="text-xs font-bold uppercase tracking-widest text-[#00C995] block mb-2">
            Mathematical Modeling
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#081525] tracking-tight">
            Interactive Compounding Returns Calculator
          </h2>
          <div className="w-16 h-1 bg-[#FF851B] mx-auto mt-4 rounded-full"></div>
          <p className="mt-4 text-base text-gray-600 leading-relaxed font-normal">
            Visualize the exponential mathematical impact of regular monthly investing combined with long-term compound growth.
          </p>
        </div>

        {/* Calculator Main Box */}
        <div className="bg-[#081525] text-white rounded-3xl p-6 sm:p-12 shadow-2xl border border-white/10 max-w-5xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            
            {/* Input Controls */}
            <div className="lg:col-span-7 space-y-7">
              
              {/* Initial Investment */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs sm:text-sm font-semibold text-gray-300">
                    Initial Lump Sum Investment
                  </label>
                  <span className="text-base sm:text-lg font-bold text-white font-mono">
                    {formatINR(initialLumpSum)}
                  </span>
                </div>
                <input 
                  type="range"
                  min="0"
                  max="1000000"
                  step="10000"
                  value={initialLumpSum}
                  onChange={(e) => setInitialLumpSum(Number(e.target.value))}
                  className="w-full accent-[#00C995] h-2 bg-slate-800 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[11px] text-gray-400 mt-1">
                  <span>₹0</span>
                  <span>₹5,00,000</span>
                  <span>₹10,00,000</span>
                </div>
              </div>

              {/* Monthly SIP */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs sm:text-sm font-semibold text-gray-300">
                    Monthly Contribution (SIP)
                  </label>
                  <span className="text-base sm:text-lg font-bold text-[#FF851B] font-mono">
                    {formatINR(monthlySip)}
                  </span>
                </div>
                <input 
                  type="range"
                  min="1000"
                  max="200000"
                  step="1000"
                  value={monthlySip}
                  onChange={(e) => setMonthlySip(Number(e.target.value))}
                  className="w-full accent-[#FF851B] h-2 bg-slate-800 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[11px] text-gray-400 mt-1">
                  <span>₹1,000</span>
                  <span>₹1,00,000</span>
                  <span>₹2,00,000</span>
                </div>
              </div>

              {/* Investment Duration */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs sm:text-sm font-semibold text-gray-300">
                    Investment Time Horizon
                  </label>
                  <span className="text-base sm:text-lg font-bold text-[#00C995] font-mono">
                    {years} Years
                  </span>
                </div>
                <input 
                  type="range"
                  min="1"
                  max="30"
                  step="1"
                  value={years}
                  onChange={(e) => setYears(Number(e.target.value))}
                  className="w-full accent-[#00C995] h-2 bg-slate-800 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[11px] text-gray-400 mt-1">
                  <span>1 Year</span>
                  <span>15 Years</span>
                  <span>30 Years</span>
                </div>
              </div>

              {/* Assumed Return Rate */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs sm:text-sm font-semibold text-gray-300">
                    Assumed Annual Compounding Rate (CAGR)
                  </label>
                  <span className="text-base sm:text-lg font-bold text-amber-400 font-mono">
                    {cagrRate}% p.a.
                  </span>
                </div>
                <input 
                  type="range"
                  min="6"
                  max="18"
                  step="0.5"
                  value={cagrRate}
                  onChange={(e) => setCagrRate(Number(e.target.value))}
                  className="w-full accent-amber-400 h-2 bg-slate-800 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[11px] text-gray-400 mt-1">
                  <span>6% (Conservative Debt)</span>
                  <span>12% (Balanced Index)</span>
                  <span>18% (Aggressive Equity)</span>
                </div>
              </div>

            </div>

            {/* Projected Results Card */}
            <div className="lg:col-span-5 bg-[#10243B] rounded-2xl p-6 sm:p-8 border border-white/10 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-6 text-gray-300 text-xs font-bold uppercase tracking-wider">
                  <Sparkles size={16} className="text-amber-400" />
                  <span>Estimated Maturity Projection</span>
                </div>

                <div className="space-y-4 mb-6">
                  <div className="flex justify-between items-center pb-3 border-b border-white/10 text-xs sm:text-sm">
                    <span className="text-gray-400">Total Invested Capital:</span>
                    <span className="font-bold text-white font-mono">{formatINR(totalInvested)}</span>
                  </div>

                  <div className="flex justify-between items-center pb-3 border-b border-white/10 text-xs sm:text-sm">
                    <span className="text-gray-400">Estimated Compound Growth:</span>
                    <span className="font-bold text-[#00C995] font-mono">+{formatINR(estimatedReturns)}</span>
                  </div>

                  <div className="flex justify-between items-center pt-2">
                    <span className="text-xs sm:text-sm font-bold text-gray-200">Total Future Corpus:</span>
                    <span className="text-2xl sm:text-3xl font-black text-[#FF851B] font-mono">
                      {formatINR(totalCorpus)}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <button 
                  onClick={() => scrollTo('#contact')}
                  className="w-full py-3.5 bg-[#FF851B] hover:bg-orange-600 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-md"
                >
                  Request Blueprint Consultation <ArrowRight size={15} />
                </button>

                <p className="text-[10px] text-gray-400 mt-3 text-center leading-tight">
                  *Illustrative calculation based on compound interest formula. Market returns are subject to volatility and can be lower or negative.
                </p>
              </div>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
}
