import React, { useState } from 'react';
import { Calculator as CalcIcon, Sparkles, AlertCircle, ArrowRight } from 'lucide-react';

export default function Calculator({ scrollTo }) {
  const [initialLumpSum, setInitialLumpSum] = useState('');
  const [monthlySip, setMonthlySip] = useState('');
  const [years, setYears] = useState('');
  const [cagrRate, setCagrRate] = useState('');

  // Correct financial compounding calculation:
  // Future Value of Initial Lump sum: P * (1 + r)^t
  // Future Value of Monthly SIP: PMT * [((1 + i)^n - 1) / i] * (1 + i)
  const calculateProjections = () => {
    if ([monthlySip, years, cagrRate].some((value) => value === '')) return null;

    const numericValues = [initialLumpSum === '' ? 0 : Number(initialLumpSum), Number(monthlySip), Number(years), Number(cagrRate)];
    if (numericValues.some((value) => !Number.isFinite(value))) return null;
    if (numericValues[0] < 0 || numericValues[0] > 1000000) return null;
    if (numericValues[1] < 1000 || numericValues[1] > 200000) return null;
    if (numericValues[2] < 1 || numericValues[2] > 30) return null;
    if (numericValues[3] < 6 || numericValues[3] > 18) return null;

    const [initialAmount, monthlyAmount, durationYears, annualRate] = numericValues;
    const r = annualRate / 100;
    const i = r / 12;
    const n = durationYears * 12;

    const lumpSumFV = initialAmount * Math.pow(1 + r, durationYears);

    let sipFV = 0;
    if (monthlyAmount > 0 && i > 0) {
      sipFV = monthlyAmount * ((Math.pow(1 + i, n) - 1) / i) * (1 + i);
    }

    const totalInvested = initialAmount + (monthlyAmount * n);
    const totalCorpus = lumpSumFV + sipFV;
    const estimatedReturns = Math.max(0, totalCorpus - totalInvested);

    return {
      totalInvested: Math.round(totalInvested),
      estimatedReturns: Math.round(estimatedReturns),
      totalCorpus: Math.round(totalCorpus)
    };
  };

  const projections = calculateProjections();
  const totalInvested = projections?.totalInvested ?? null;
  const estimatedReturns = projections?.estimatedReturns ?? null;
  const totalCorpus = projections?.totalCorpus ?? null;

  const formatINR = (val) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
  };

  return (
    <section id="calculator" className="relative py-16 md:py-24 bg-white text-slate-900 border-b border-slate-200 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Heading */}
        <div className="max-w-3xl mx-auto text-center mb-12">
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full border border-blue-200 bg-blue-50 text-xs font-bold uppercase tracking-wider text-blue-700 mb-3 shadow-xs">
            ★ Planning & Projections
          </span>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight">
            SIP & Wealth Growth Calculator
          </h2>
          <div className="w-16 h-1 bg-blue-600 mx-auto mt-3 rounded-full"></div>
          <p className="mt-3 text-sm sm:text-base text-slate-600 leading-relaxed font-normal">
            Calculate your potential future returns mathematically with compound interest formulas. Enter your own values to preview projections.
          </p>
        </div>

        {/* Calculator Main Box */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-xl max-w-5xl mx-auto p-6 sm:p-10">
          <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50/80 px-4 py-3 text-xs leading-5 text-blue-900">
            <strong className="text-blue-700 font-bold">ILLUSTRATIVE TOOL:</strong> Projections are mathematical calculations based on assumed compounded returns. Market-linked investments are subject to risk and outcomes are not guaranteed.
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            {/* Input Controls */}
            <div className="lg:col-span-7 space-y-5">
              
              {/* Initial Investment */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label htmlFor="calculator-initial-amount" className="text-xs sm:text-sm font-bold text-slate-800">
                    Initial Lump Sum Investment (₹)
                  </label>
                </div>
                <input
                  id="calculator-initial-amount"
                  type="number"
                  min="0"
                  max="1000000"
                  step="10000"
                  value={initialLumpSum}
                  onChange={(e) => setInitialLumpSum(e.target.value)}
                  className="w-full h-[42px] rounded-xl border border-slate-300 bg-white px-3.5 text-sm text-slate-900 focus:border-blue-600 focus:ring-4 focus:ring-blue-100 outline-none transition-all shadow-xs"
                  placeholder=""
                />
                <p className="mt-1 text-[11px] text-slate-500">Optional initial deposit; up to ₹10,00,000.</p>
              </div>

              {/* Monthly SIP */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label htmlFor="calculator-monthly-amount" className="text-xs sm:text-sm font-bold text-slate-800">
                    Monthly Contribution (₹)
                  </label>
                </div>
                <input
                  id="calculator-monthly-amount"
                  type="number"
                  min="1000"
                  max="200000"
                  step="1000"
                  value={monthlySip}
                  onChange={(e) => setMonthlySip(e.target.value)}
                  className="w-full h-[42px] rounded-xl border border-slate-300 bg-white px-3.5 text-sm text-slate-900 focus:border-blue-600 focus:ring-4 focus:ring-blue-100 outline-none transition-all shadow-xs"
                  placeholder=""
                />
                <p className="mt-1 text-[11px] text-slate-500">₹1,000 to ₹2,00,000 per month.</p>
              </div>

              {/* Investment Duration */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label htmlFor="calculator-years" className="text-xs sm:text-sm font-bold text-slate-800">
                    Investment Time Horizon (years)
                  </label>
                </div>
                <input
                  id="calculator-years"
                  type="number"
                  min="1"
                  max="30"
                  step="1"
                  value={years}
                  onChange={(e) => setYears(e.target.value)}
                  className="w-full h-[42px] rounded-xl border border-slate-300 bg-white px-3.5 text-sm text-slate-900 focus:border-blue-600 focus:ring-4 focus:ring-blue-100 outline-none transition-all shadow-xs"
                  placeholder=""
                />
                <p className="mt-1 text-[11px] text-slate-500">1 to 30 years.</p>
              </div>

              {/* Assumed Return Rate */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label htmlFor="calculator-rate" className="text-xs sm:text-sm font-bold text-slate-800">
                    Assumed Annual Rate (%)
                  </label>
                </div>
                <input
                  id="calculator-rate"
                  type="number"
                  min="6"
                  max="18"
                  step="0.5"
                  value={cagrRate}
                  onChange={(e) => setCagrRate(e.target.value)}
                  className="w-full h-[42px] rounded-xl border border-slate-300 bg-white px-3.5 text-sm text-slate-900 focus:border-blue-600 focus:ring-4 focus:ring-blue-100 outline-none transition-all shadow-xs"
                  placeholder=""
                />
                <p className="mt-1 text-[11px] text-slate-500">Enter expected rate between 6% and 18%.</p>
              </div>

            </div>

            {/* Projected Results Card */}
            <div className="lg:col-span-5 bg-slate-900 text-white rounded-2xl p-6 sm:p-8 flex flex-col justify-between shadow-xl">
              <div>
                <div className="flex items-center gap-2 mb-5 text-blue-300 text-xs font-bold uppercase tracking-wider">
                  <Sparkles size={16} className="text-amber-400" />
                  <span>Estimated Maturity Projection</span>
                </div>

                {!projections && (
                  <p className="mb-6 rounded-xl border border-white/10 bg-white/5 p-4 text-xs leading-5 text-slate-300">
                    Enter monthly amount, time horizon, and assumed rate to calculate your projected corpus.
                  </p>
                )}

                <div className="space-y-3.5 mb-6">
                  <div className="flex justify-between items-center pb-2.5 border-b border-white/10 text-xs sm:text-sm">
                    <span className="text-slate-400">Total Invested Capital:</span>
                    <span className="font-bold text-white font-mono">{totalInvested === null ? '—' : formatINR(totalInvested)}</span>
                  </div>

                  <div className="flex justify-between items-center pb-2.5 border-b border-white/10 text-xs sm:text-sm">
                    <span className="text-slate-400">Estimated Compound Growth:</span>
                    <span className="font-bold text-emerald-400 font-mono">{estimatedReturns === null ? '—' : `+${formatINR(estimatedReturns)}`}</span>
                  </div>

                  <div className="flex justify-between items-center pt-2">
                    <span className="text-xs sm:text-sm font-bold text-slate-200">Total Projected Corpus:</span>
                    <span className="text-2xl sm:text-3xl font-black text-amber-400 font-mono">
                      {totalCorpus === null ? '—' : formatINR(totalCorpus)}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <button 
                  onClick={() => scrollTo('#contact')}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-md active:scale-98 cursor-pointer"
                >
                  Request Consultation <ArrowRight size={15} />
                </button>

                <p className="text-[10px] text-slate-400 mt-2.5 text-center leading-tight">
                  *Illustrative calculation based on standard compounding formulas.
                </p>
              </div>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
}
