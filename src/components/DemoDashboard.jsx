import React, { useState } from 'react';
import { 
  PlayCircle, 
  RotateCcw, 
  ArrowLeft, 
  TrendingUp, 
  PieChart, 
  BarChart3, 
  ShieldCheck, 
  AlertCircle, 
  Clock, 
  CheckCircle2, 
  DollarSign, 
  SlidersHorizontal 
} from 'lucide-react';
import { INITIAL_DEMO_PORTFOLIO } from '../data/demoPortfolio';
import LiveDateTime from './LiveDateTime';

export default function DemoDashboard({ setCurrentView }) {
  const [portfolioData, setPortfolioData] = useState(INITIAL_DEMO_PORTFOLIO);
  const [demoDuration, setDemoDuration] = useState(5);
  const [demoReturnRate, setDemoReturnRate] = useState(12.5);

  const formatINR = (val) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
  };

  const handleResetDemo = () => {
    setPortfolioData(INITIAL_DEMO_PORTFOLIO);
    setDemoDuration(5);
    setDemoReturnRate(12.5);
  };

  // Demo interactive compounding calculation
  const demoCompoundedValue = Math.round(
    portfolioData.totalValue * Math.pow(1 + demoReturnRate / 100, demoDuration)
  );

  return (
    <div className="min-h-screen bg-[#081525] text-white font-sans">
      
      {/* 1. PERSISTENT MANDATORY DEMO BANNER */}
      <div className="bg-amber-500 text-slate-950 font-bold px-4 py-3 text-xs sm:text-sm text-center sticky top-0 z-50 shadow-md flex items-center justify-center gap-2">
        <AlertCircle size={18} className="flex-shrink-0" />
        <span>
          DEMO MODE — SAMPLE DATA ONLY. This portfolio is simulated and does not represent actual investments, customer funds, or guaranteed returns.
        </span>
      </div>

      {/* Demo Dashboard Top Bar */}
      <header className="bg-[#10243B] border-b border-white/10 px-4 sm:px-8 py-4 flex flex-wrap justify-between items-center gap-4">
        <div className="order-1 flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-tr from-[#876A2E] to-[#876A2E] rounded-xl flex items-center justify-center shadow-md">
            <TrendingUp size={22} className="text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-extrabold text-base text-white">Interactive Demo Portfolio</h2>
              <span className="text-[10px] font-black uppercase tracking-wider bg-amber-400 text-slate-950 px-2 py-0.5 rounded">
                SIMULATION
              </span>
            </div>
            <span className="text-xs text-gray-400">Account ID: {portfolioData.accountNumber}</span>
          </div>
        </div>

        <LiveDateTime className="order-2 w-full sm:w-auto" />

        <div className="order-3 flex items-center gap-3">
          <button 
            onClick={handleResetDemo}
            className="px-3.5 py-2 text-xs font-bold rounded-lg border border-white/20 text-gray-200 hover:bg-white/10 transition-colors flex items-center gap-1.5"
            title="Reset to initial sample data"
          >
            <RotateCcw size={14} /> Reset Demo Data
          </button>

          <button 
            onClick={() => setCurrentView('home')}
            className="px-4 py-2 text-xs font-bold rounded-lg bg-[#876A2E] hover:bg-[#725522] text-white transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <ArrowLeft size={14} /> Exit Demo & Return Home
          </button>
        </div>
      </header>

      {/* Main Demo Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Welcome & Strategy Profile Card */}
        <div className="bg-[#10243B] p-6 rounded-3xl border border-white/10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-xl">
          <div>
            <span className="text-[#50745A] text-xs font-bold uppercase tracking-wider block mb-1">
              Sample Model Portfolio
            </span>
            <h1 className="text-2xl font-black text-white">{portfolioData.accountName}</h1>
            <p className="text-xs sm:text-sm text-gray-300 mt-1">
              Strategy: <strong className="text-white">{portfolioData.accountType}</strong> | Focus: Capital Preservation & Balanced Growth
            </p>
          </div>

          <div className="flex items-center gap-2 bg-[#081525] px-4 py-2.5 rounded-xl border border-white/10">
            <ShieldCheck size={20} className="text-[#50745A]" />
            <div className="text-left">
              <span className="text-[10px] text-gray-400 uppercase tracking-wider block">Risk Tolerance</span>
              <span className="text-xs font-bold text-white">{portfolioData.riskCategory}</span>
            </div>
          </div>
        </div>

        {/* 4 Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="bg-[#10243B] p-5 rounded-2xl border border-white/10">
            <span className="text-xs text-gray-400 font-medium">Sample Portfolio Value</span>
            <h3 className="text-2xl font-black text-white mt-1">
              {formatINR(portfolioData.totalValue)}
            </h3>
            <span className="text-xs text-[#50745A] font-bold mt-1 inline-block">
              +{portfolioData.unrealizedReturnPercentage}% (Illustrative)
            </span>
          </div>

          <div className="bg-[#10243B] p-5 rounded-2xl border border-white/10">
            <span className="text-xs text-gray-400 font-medium">Invested Principal</span>
            <h3 className="text-2xl font-black text-white mt-1">
              {formatINR(portfolioData.initialCapital)}
            </h3>
            <span className="text-xs text-gray-400 mt-1 inline-block">Net Cost Basis</span>
          </div>

          <div className="bg-[#10243B] p-5 rounded-2xl border border-white/10">
            <span className="text-xs text-gray-400 font-medium">Illustrative Compound Gain</span>
            <h3 className="text-2xl font-black text-[#50745A] mt-1">
              +{formatINR(portfolioData.totalValue - portfolioData.initialCapital)}
            </h3>
            <span className="text-xs text-gray-400 mt-1 inline-block">Sample Simulation</span>
          </div>

          <div className="bg-[#10243B] p-5 rounded-2xl border border-white/10">
            <span className="text-xs text-gray-400 font-medium">Monthly Disciplined SIP</span>
            <h3 className="text-2xl font-black text-[#876A2E] mt-1">
              {formatINR(portfolioData.monthlySipAmount)}
            </h3>
            <span className="text-xs text-gray-400 mt-1 inline-block">Auto-allocation model</span>
          </div>
        </div>

        {/* Asset Allocation Breakdown & Interactive Simulator */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Allocation Breakdown (7 cols) */}
          <div className="lg:col-span-7 bg-[#10243B] p-6 sm:p-7 rounded-3xl border border-white/10 shadow-xl">
            <div className="flex justify-between items-center mb-6 pb-3 border-b border-white/10">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <PieChart size={18} className="text-[#876A2E]" />
                Simulated Asset Allocation
              </h3>
              <span className="text-xs text-gray-400">Multi-Asset Blueprint</span>
            </div>

            <div className="space-y-5">
              {portfolioData.allocation.map((item, idx) => (
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
                  <div className="w-full bg-[#081525] h-3 rounded-full overflow-hidden border border-white/5">
                    <div 
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${item.percentage}%`, backgroundColor: item.color }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>

            <p className="text-[11px] text-gray-400 mt-6 leading-relaxed">
              *Illustrative multi-asset allocation. In real client portfolios, actual weightings are dynamically tailored to the individual's specific cash flow horizon, tax bracket, and risk capacity.
            </p>
          </div>

          {/* Interactive Demo Returns Projection Simulator (5 cols) */}
          <div className="lg:col-span-5 bg-[#10243B] p-6 sm:p-7 rounded-3xl border border-white/10 shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-white/10">
                <SlidersHorizontal size={18} className="text-[#50745A]" />
                <h3 className="text-base font-bold text-white">Interactive Returns Simulator</h3>
              </div>

              <div className="space-y-5 mb-6">
                <div>
                  <div className="flex justify-between text-xs font-medium text-gray-300 mb-1">
                    <span>Horizon Forward Projection:</span>
                    <span className="font-bold text-white font-mono">{demoDuration} Years</span>
                  </div>
                  <input 
                    type="range"
                    min="1"
                    max="20"
                    step="1"
                    value={demoDuration}
                    onChange={(e) => setDemoDuration(Number(e.target.value))}
                    className="w-full accent-[#50745A] h-2 bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs font-medium text-gray-300 mb-1">
                    <span>Assumed Annual CAGR:</span>
                    <span className="font-bold text-amber-400 font-mono">{demoReturnRate}%</span>
                  </div>
                  <input 
                    type="range"
                    min="6"
                    max="18"
                    step="0.5"
                    value={demoReturnRate}
                    onChange={(e) => setDemoReturnRate(Number(e.target.value))}
                    className="w-full accent-amber-400 h-2 bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>
              </div>

              {/* Projected Corpus Result */}
              <div className="bg-[#081525] p-4 rounded-2xl border border-white/10 mb-4">
                <span className="text-[11px] text-gray-400 block uppercase tracking-wider font-semibold">
                  Projected Portfolio Value in {demoDuration} Years:
                </span>
                <span className="text-2xl font-black text-[#876A2E] font-mono mt-1 block">
                  {formatINR(demoCompoundedValue)}
                </span>
                <span className="text-[11px] text-[#50745A] mt-1 block">
                  +{formatINR(demoCompoundedValue - portfolioData.totalValue)} (Mathematical Growth)
                </span>
              </div>
            </div>

            <p className="text-[10px] text-gray-400 text-center leading-tight">
              *Mathematical projection for demonstration. Real financial returns are non-linear and fluctuate with market volatility.
            </p>
          </div>

        </div>

        {/* Sample Holdings Table */}
        <div className="bg-[#10243B] rounded-3xl border border-white/10 p-6 sm:p-7 shadow-xl overflow-hidden">
          <h3 className="text-base font-bold text-white mb-4">
            Sample Asset Holdings & Allocation Model
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-300">
              <thead className="bg-[#081525] text-gray-400 uppercase text-[10px] font-bold tracking-wider">
                <tr>
                  <th className="py-3 px-4 rounded-l-lg">Asset / Strategy Basket</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Portfolio Weight</th>
                  <th className="py-3 px-4 rounded-r-lg">Illustrative Metric / Benchmark</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {portfolioData.sampleHoldings.map((holding, i) => (
                  <tr key={i} className="hover:bg-white/5 transition-colors">
                    <td className="py-3 px-4 font-semibold text-white">{holding.asset}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 bg-white/10 rounded text-[10px] font-medium">
                        {holding.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-[#876A2E]">{holding.allocation}</td>
                    <td className="py-3 px-4 text-gray-300 font-mono text-[11px]">{holding.trend}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Sample Transactions Ledger */}
        <div className="bg-[#10243B] rounded-3xl border border-white/10 p-6 sm:p-7 shadow-xl overflow-hidden">
          <h3 className="text-base font-bold text-white mb-4">
            Sample Transaction Ledger (Simulated)
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-300">
              <thead className="bg-[#081525] text-gray-400 uppercase text-[10px] font-bold tracking-wider">
                <tr>
                  <th className="py-3 px-4 rounded-l-lg">Tx ID</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4 rounded-r-lg">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {portfolioData.sampleTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-3 px-4 font-mono text-gray-400">{tx.id}</td>
                    <td className="py-3 px-4">{tx.date}</td>
                    <td className="py-3 px-4 font-medium text-white">{tx.description}</td>
                    <td className="py-3 px-4 font-mono font-bold text-[#50745A]">{tx.amount}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 bg-emerald-500/15 text-[#50745A] rounded text-[10px] font-bold">
                        {tx.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Call to action at bottom of demo */}
        <div className="bg-gradient-to-r from-[#10243B] to-[#081525] border border-white/15 p-8 rounded-3xl text-center space-y-4">
          <h3 className="text-xl sm:text-2xl font-bold text-white">
            Ready for a Real, Personalized Strategy?
          </h3>
          <p className="text-xs sm:text-sm text-gray-300 max-w-xl mx-auto font-normal">
            Every investor's journey is unique. Connect with our dedicated advisory team to build your actual multi-asset roadmap.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4 pt-2">
            <button 
              onClick={() => setCurrentView('auth-signup')}
              className="px-6 py-3 bg-[#876A2E] hover:bg-[#725522] text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all shadow-md"
            >
              Create Real Client Account
            </button>
            <a 
              href="https://wa.me/919812947813?text=Hello%20Mehanda%20Army%20Investments%2C%20I%20reviewed%20the%20demo%20portfolio%20and%20would%20like%20a%20consultation."
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 bg-[#25D366] hover:bg-emerald-600 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2"
            >
              Inquire on WhatsApp (+91 9812947813)
            </a>
          </div>
        </div>

      </main>
    </div>
  );
}
