import React, { useState } from 'react';
import {
  GraduationCap,
  Sparkles,
  TrendingUp,
  ArrowRight,
  CheckCircle2,
  ShieldCheck,
  Building2,
  DollarSign,
  PieChart,
} from 'lucide-react';

export default function Services({ scrollTo, setCurrentView }) {
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'loans', 'investments'

  const loanProducts = [
    {
      id: 'student-loan',
      title: 'Student Education Loan',
      subtitle: 'Higher Studies & Career Growth',
      amount: 'Up to ₹50,00,000',
      category: 'Student Loan',
      badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
      accentColor: 'text-blue-700 bg-blue-50',
      icon: <GraduationCap size={24} className="text-blue-600" />,
      desc: 'Transparent education financing for college tuition, competitive entrance prep, books, and living expenses across India.',
      features: [
        '100% Digital application with instant tracking',
        'Direct institutional disbursal option',
        'Flexible student-friendly repayment terms',
      ],
      ctaText: 'Apply for Student Loan',
      action: () => setCurrentView?.('student-loan'),
    },
    {
      id: 'dairy-loan',
      title: 'Dairy Farming Loan',
      subtitle: 'Commercial Dairy Cattle & Infra',
      amount: '₹2,00,000 – ₹50,00,000',
      category: 'Dairy Farming',
      badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      accentColor: 'text-emerald-700 bg-emerald-50',
      icon: <Sparkles size={24} className="text-emerald-600" />,
      desc: 'Dedicated capital for high-yield milch cattle purchase, modern shed construction, automated milking units, and cold storage.',
      features: [
        'Financing from ₹2 Lakh to ₹50 Lakh',
        'Support for cattle sheds & chilling machinery',
        'Quick in-principle digital verification',
      ],
      ctaText: 'Apply for Dairy Loan',
      action: () => setCurrentView?.('loan-categories'),
    },
    {
      id: 'sheep-loan',
      title: 'Sheep Farming Loan',
      subtitle: 'Flock Expansion & Animal Husbandry',
      amount: 'Up to ₹2,00,000',
      category: 'Sheep Farming',
      badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-200',
      accentColor: 'text-indigo-700 bg-indigo-50',
      icon: <CheckCircle2 size={24} className="text-indigo-600" />,
      desc: 'Accessible financial assistance for sheep purchase, safe fencing, shed construction, vaccination, and seasonal fodder procurement.',
      features: [
        'Loans up to ₹2 Lakhs with low upfront costs',
        'Fast rural KYC & minimal documentation',
        'Repayment aligned with farming income cycles',
      ],
      ctaText: 'Apply for Sheep Loan',
      action: () => setCurrentView?.('loan-categories'),
    },
    {
      id: 'goat-loan',
      title: 'Goat Farming Loan',
      subtitle: 'Commercial Goat Rearing & Breeding',
      amount: 'Up to ₹2,00,000',
      category: 'Goat Farming',
      badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
      accentColor: 'text-amber-700 bg-amber-50',
      icon: <CheckCircle2 size={24} className="text-amber-600" />,
      desc: 'Tailored loans for commercial goat rearing units, superior breed procurement, elevated shed setup, and veterinary health management.',
      features: [
        'Loan sanction up to ₹2,00,000',
        'Direct bank transfer upon document verification',
        'Dedicated agricultural relationship manager',
      ],
      ctaText: 'Apply for Goat Loan',
      action: () => setCurrentView?.('loan-categories'),
    },
    {
      id: 'wealth-investments',
      title: 'Strategic Wealth Portfolio',
      subtitle: 'Multi-Asset Compounding & Advisory',
      amount: 'Custom Portfolios',
      category: 'Wealth Growth',
      badgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
      accentColor: 'text-purple-700 bg-purple-50',
      icon: <TrendingUp size={24} className="text-purple-600" />,
      desc: 'Systematic multi-asset wealth allocation across large-cap equities, high-grade debt, and gold hedges designed for capital preservation.',
      features: [
        'Personalized risk-calibrated asset allocation',
        'Disciplined client-focused rebalancing protocols',
        '100% Transparency with zero speculative leverage',
      ],
      ctaText: 'Explore Investment Plans',
      action: () => setCurrentView?.('investment-info'),
    },
  ];

  const filteredProducts = loanProducts.filter((item) => {
    if (activeTab === 'loans') return item.id !== 'wealth-investments';
    if (activeTab === 'investments') return item.id === 'wealth-investments';
    return true;
  });

  return (
    <section id="services" className="relative py-16 md:py-24 bg-slate-50 text-slate-900 border-b border-slate-200/90 overflow-hidden">
      {/* Background Soft Glow */}
      <div className="pointer-events-none absolute -top-32 right-0 w-96 h-96 bg-blue-100/50 rounded-full blur-3xl" aria-hidden="true" />
      <div className="pointer-events-none absolute -bottom-32 left-0 w-96 h-96 bg-emerald-100/40 rounded-full blur-3xl" aria-hidden="true" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header (Big Finance Style) */}
        <div className="max-w-3xl mx-auto text-center mb-10">
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full border border-blue-200 bg-blue-50 text-xs font-bold uppercase tracking-wider text-blue-700 mb-3 shadow-xs">
            ★ Institutional Financial Solutions
          </span>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight">
            Our Core Financial Products
          </h2>
          <div className="w-16 h-1 bg-blue-600 mx-auto mt-3 rounded-full"></div>
          <p className="mt-3 text-sm sm:text-base text-slate-600 leading-relaxed font-normal">
            Choose from dedicated student loans, high-value agricultural farming loans, or disciplined multi-asset wealth growth portfolios with complete digital transparency.
          </p>

          {/* Segmented Filter Pills */}
          <div className="mt-6 inline-flex flex-wrap justify-center items-center gap-1 p-1 bg-slate-200/80 rounded-xl shadow-xs max-w-full">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`px-3 sm:px-4 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Products ({loanProducts.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('loans')}
              className={`px-3 sm:px-4 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeTab === 'loans'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Loan Categories (4)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('investments')}
              className={`px-3 sm:px-4 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeTab === 'investments'
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Wealth Investment (1)
            </button>
          </div>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((item) => (
            <div 
              key={item.id} 
              className="group relative rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-xl hover:border-blue-400 hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between"
            >
              <div>
                {/* Card Top: Icon & Amount Badge */}
                <div className="flex justify-between items-start mb-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center border border-slate-200 ${item.accentColor} shadow-xs group-hover:scale-105 transition-transform`}>
                    {item.icon}
                  </div>
                  <span className={`text-[11px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border ${item.badgeColor}`}>
                    {item.amount}
                  </span>
                </div>

                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  {item.category}
                </div>

                <h3 className="text-lg font-bold text-slate-900 mb-1.5 leading-snug group-hover:text-blue-700 transition-colors">
                  {item.title}
                </h3>
                
                <p className="text-xs text-blue-700 font-semibold mb-3">
                  {item.subtitle}
                </p>

                <p className="text-xs text-slate-600 leading-relaxed mb-5 font-normal">
                  {item.desc}
                </p>

                {/* Features List */}
                <div className="space-y-2 pt-3 border-t border-slate-100 mb-6">
                  {item.features.map((feat, fIdx) => (
                    <div key={fIdx} className="flex items-start gap-2 text-xs text-slate-700">
                      <CheckCircle2 size={14} className="text-emerald-600 flex-shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-3 border-t border-slate-100">
                <button 
                  type="button"
                  onClick={item.action}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2.5 px-4 shadow-sm group-hover:shadow-md transition-all active:scale-98 cursor-pointer"
                >
                  <span>{item.ctaText}</span>
                  <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>

            </div>
          ))}
        </div>

        {/* Bottom Banner Note */}
        <div className="mt-12 rounded-2xl border border-blue-200 bg-blue-50/70 p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-center sm:text-left">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                Need Help Selecting the Right Loan or Investment Scheme?
              </h4>
              <p className="text-xs text-slate-600 mt-0.5">
                Our certified credit officers and wealth managers are ready to assist you directly.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => scrollTo('#contact')}
            className="shrink-0 px-4 py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 text-xs font-bold transition shadow-xs cursor-pointer"
          >
            Speak to a Specialist ➔
          </button>
        </div>

      </div>
    </section>
  );
}
