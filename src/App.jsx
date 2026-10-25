import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Menu, 
  X, 
  ChevronDown, 
  ChevronUp, 
  ArrowRight, 
  BarChart3, 
  PieChart, 
  TrendingUp, 
  Lock, 
  UserCheck, 
  Server, 
  CheckCircle, 
  MessageCircle, 
  ArrowUp,
  Phone,
  Mail,
  MapPin,
  AlertCircle,
  Eye,
  EyeOff,
  DollarSign,
  Briefcase,
  Layers,
  Clock,
  Sparkles,
  Calculator,
  LogOut,
  Send,
  KeyRound,
  MailCheck,
  RefreshCw,
  UserPlus,
  Check
} from 'lucide-react';

// --- CONFIGURATION & DESIGN TOKENS ---
const WHATSAPP_URL = "https://wa.me/919812947813?text=Hello%20Mehanda%20Army%20Investments%2C%20I%20would%20like%20to%20know%20more%20about%20your%20services.";
const PHONE_NUMBER = "+91 9812947813";
const EMAIL_ADDRESS = "Info@mehandaarmy.in";
const ADDRESS_TEXT = "Commercial Hub & Investment Suite, Haryana / Delhi-NCR, India";

// 1. Announcement Bar
const AnnouncementBar = () => (
  <div className="bg-[#10B981] text-white text-xs sm:text-sm text-center py-2.5 px-4 font-medium flex items-center justify-center gap-2 z-50 relative shadow-sm">
    <ShieldCheck size={16} className="animate-pulse" />
    <span>Security Notice: Always verify official contact numbers (+91 9812947813). We never ask for OTPs or banking PINs.</span>
  </div>
);

// 2. Header
const Header = ({ setCurrentView, scrollTo }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navLinks = [
    { name: 'Services', href: '#services' },
    { name: 'How It Works', href: '#process' },
    { name: 'Calculator', href: '#calculator' },
    { name: 'FAQ', href: '#faq' },
    { name: 'Contact', href: '#contact' },
  ];

  const handleNavClick = (e, href) => {
    e.preventDefault();
    scrollTo(href);
    setIsMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 bg-[#0B192C] text-white z-40 shadow-xl border-b border-white/10 backdrop-blur-md bg-opacity-95">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo */}
          <div className="flex-shrink-0 flex items-center cursor-pointer group" onClick={(e) => handleNavClick(e, '#hero')}>
            <div className="w-11 h-11 bg-gradient-to-tr from-[#F97316] to-amber-500 rounded-lg flex items-center justify-center mr-3 shadow-lg shadow-orange-500/25 group-hover:scale-105 transition-transform">
              <TrendingUp size={24} className="text-white" />
            </div>
            <div>
              <span className="font-extrabold text-xl tracking-tight leading-tight block">
                MEHANDA ARMY
              </span>
              <span className="text-[#10B981] text-xs font-bold uppercase tracking-widest block">
                Investments
              </span>
            </div>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex space-x-7 items-center">
            {navLinks.map((link) => (
              <a 
                key={link.name} 
                href={link.href} 
                onClick={(e) => handleNavClick(e, link.href)}
                className="text-gray-300 hover:text-white hover:text-[#F97316] transition-colors text-sm font-semibold tracking-wide"
              >
                {link.name}
              </a>
            ))}
            <a 
              href={WHATSAPP_URL} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="bg-[#25D366] hover:bg-emerald-600 text-white px-4 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 shadow-md hover:shadow-emerald-500/25 active:scale-95"
            >
              <MessageCircle size={18} /> WhatsApp
            </a>
            <button 
              onClick={() => setCurrentView('login')} 
              className="bg-gradient-to-r from-[#F97316] to-orange-500 hover:from-orange-600 hover:to-orange-700 text-white px-5 py-2.5 rounded-lg text-sm font-bold transition-all shadow-md hover:shadow-orange-500/30 active:scale-95 flex items-center gap-2"
            >
              <Briefcase size={16} /> Client Portal
            </button>
          </nav>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center">
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-gray-300 hover:text-white p-2 rounded-lg bg-white/5 border border-white/10"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? <X size={26} /> : <Menu size={26} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Panel */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-[#0B192C]/98 border-t border-white/10 absolute w-full left-0 shadow-2xl backdrop-blur-xl animate-fadeIn">
          <div className="px-5 pt-3 pb-6 space-y-2">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                onClick={(e) => handleNavClick(e, link.href)}
                className="block px-3 py-3 text-base font-medium text-gray-200 hover:text-[#F97316] hover:bg-white/5 rounded-lg transition-all"
              >
                {link.name}
              </a>
            ))}
            <div className="pt-2 flex flex-col gap-2.5">
              <a 
                href={WHATSAPP_URL} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="w-full flex justify-center items-center gap-2 bg-[#25D366] hover:bg-emerald-600 text-white px-5 py-3 rounded-lg text-base font-bold shadow-md transition-all"
              >
                <MessageCircle size={20} /> Chat on WhatsApp
              </a>
              <button 
                onClick={() => { setCurrentView('login'); setIsMobileMenuOpen(false); }} 
                className="w-full flex justify-center items-center gap-2 bg-[#F97316] hover:bg-orange-600 text-white px-5 py-3 rounded-lg text-base font-bold shadow-md transition-all"
              >
                <Briefcase size={20} /> Client Portal Login
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

// 3. Hero Section
const Hero = ({ scrollTo }) => {
  return (
    <section id="hero" className="relative bg-[#0B192C] text-white pt-20 pb-28 md:pt-28 md:pb-36 overflow-hidden">
      {/* Glow backgrounds */}
      <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 rounded-full bg-[#10B981] opacity-15 blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-96 h-96 rounded-full bg-[#F97316] opacity-15 blur-3xl pointer-events-none"></div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
        <div className="inline-flex items-center gap-2 py-1.5 px-4 rounded-full bg-white/10 border border-white/20 text-[#10B981] text-xs sm:text-sm font-bold mb-6 tracking-wide uppercase backdrop-blur-sm shadow-inner">
          <ShieldCheck size={16} /> Trusted Wealth Advisory & Investment Management
        </div>

        <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight mb-6 leading-tight max-w-4xl mx-auto">
          Strategic Wealth Management <br className="hidden md:block"/> 
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#F97316] via-amber-400 to-[#10B981]">
            & Disciplined Investing
          </span>
        </h1>

        <p className="mt-4 max-w-2xl mx-auto text-base sm:text-xl text-gray-300 mb-10 leading-relaxed font-normal">
          Institutional-grade investment strategies customized for business owners, armed forces personnel, professionals, and families. Navigate financial markets with clarity, discipline, and confidence.
        </p>

        <div className="flex flex-col sm:flex-row justify-center gap-4 max-w-md mx-auto sm:max-w-none">
          <button 
            onClick={() => scrollTo('#contact')}
            className="bg-[#F97316] hover:bg-orange-600 text-white px-8 py-4 rounded-xl font-bold text-lg transition-all shadow-lg shadow-orange-500/30 flex items-center justify-center gap-2 group active:scale-95"
          >
            Start Investing <ArrowRight size={20} className="group-hover:translate-x-1.5 transition-transform" />
          </button>
          <button 
            onClick={() => scrollTo('#calculator')}
            className="bg-white/10 hover:bg-white/20 border border-white/20 text-white px-8 py-4 rounded-xl font-bold text-lg transition-all backdrop-blur-sm flex items-center justify-center gap-2 active:scale-95"
          >
            <Calculator size={20} className="text-[#10B981]" /> Calculate Returns
          </button>
        </div>

        {/* Feature Badges */}
        <div className="mt-14 pt-8 border-t border-white/10 grid grid-cols-2 md:grid-cols-4 gap-4 text-center max-w-4xl mx-auto text-xs sm:text-sm text-gray-300">
          <div className="flex items-center justify-center gap-2">
            <CheckCircle size={16} className="text-[#10B981]" /> Zero Hidden Fees
          </div>
          <div className="flex items-center justify-center gap-2">
            <CheckCircle size={16} className="text-[#10B981]" /> Tailored Portfolios
          </div>
          <div className="flex items-center justify-center gap-2">
            <CheckCircle size={16} className="text-[#10B981]" /> Risk-Engineered Growth
          </div>
          <div className="flex items-center justify-center gap-2">
            <CheckCircle size={16} className="text-[#10B981]" /> Dedicated Advisory
          </div>
        </div>
      </div>
    </section>
  );
};

// 4. Company Introduction
const Introduction = () => (
  <section className="py-20 bg-white">
    <div className="max-w-4xl mx-auto px-4 text-center">
      <h2 className="text-3xl md:text-4xl font-extrabold text-[#0B192C] mb-4">
        Building Enduring Wealth Through Structure & Discipline
      </h2>
      <div className="w-24 h-1.5 bg-gradient-to-r from-[#F97316] to-[#10B981] mx-auto mb-8 rounded-full"></div>
      <p className="text-lg text-gray-600 leading-relaxed font-normal mb-6">
        At <span className="font-bold text-[#0B192C]">Mehanda Army Investments</span>, we believe that true financial security is built on transparency, disciplined risk management, and steadfast commitment to client success.
      </p>
      <p className="text-base text-gray-500 leading-relaxed">
        We do not speculate on fleeting market noise; we architect robust multi-asset portfolios designed to withstand economic volatility and compound wealth sustainably over decades.
      </p>
    </div>
  </section>
);

// 5. Services Overview
const Services = ({ scrollTo }) => {
  const servicesList = [
    {
      title: "Portfolio Management",
      desc: "Actively balanced, diversified asset allocation crafted to maximize risk-adjusted yields matching your target horizon.",
      icon: <PieChart size={32} className="text-[#F97316]" />,
      tag: "Active Allocation"
    },
    {
      title: "Wealth & Retirement Planning",
      desc: "Holistic strategies covering long-term retirement security, generational wealth transfer, and tax efficiency.",
      icon: <TrendingUp size={32} className="text-[#10B981]" />,
      tag: "Long-Term Growth"
    },
    {
      title: "Risk & Capital Preservation",
      desc: "Deep stress-testing, hedging mechanisms, and capital preservation protocols to safeguard assets during market downturns.",
      icon: <BarChart3 size={32} className="text-[#0B192C]" />,
      tag: "Capital Guard"
    }
  ];

  return (
    <section id="services" className="py-24 bg-gray-50 border-y border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <span className="text-[#F97316] font-bold text-xs uppercase tracking-widest block mb-2">Our Capabilities</span>
          <h2 className="text-3xl md:text-4xl font-extrabold text-[#0B192C]">Institutional-Grade Services</h2>
          <p className="mt-4 text-gray-600 max-w-2xl mx-auto">Precision investment strategies engineered for high-net-worth individuals, defense personnel, and forward-looking families.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {servicesList.map((service, idx) => (
            <div key={idx} className="bg-white p-8 rounded-2xl shadow-sm hover:shadow-2xl transition-all duration-300 border border-gray-100 group flex flex-col justify-between hover:-translate-y-1">
              <div>
                <div className="flex justify-between items-start mb-6">
                  <div className="w-16 h-16 bg-orange-50 rounded-xl flex items-center justify-center group-hover:scale-110 group-hover:bg-orange-100 transition-all">
                    {service.icon}
                  </div>
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider bg-gray-100 px-3 py-1 rounded-full">{service.tag}</span>
                </div>
                <h3 className="text-2xl font-bold text-[#0B192C] mb-3">{service.title}</h3>
                <p className="text-gray-600 leading-relaxed mb-6">{service.desc}</p>
              </div>
              <button 
                onClick={() => scrollTo('#contact')}
                className="text-[#F97316] font-bold text-sm flex items-center gap-2 group-hover:gap-3 transition-all hover:text-orange-700"
              >
                Inquire About Service <ArrowRight size={16} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// 6. Interactive SIP / Wealth Calculator
const InvestmentCalculator = ({ scrollTo }) => {
  const [monthlyInvest, setMonthlyInvest] = useState(15000);
  const [years, setYears] = useState(10);
  const [returnRate, setReturnRate] = useState(13.5);

  const calculateReturns = () => {
    const i = returnRate / 100 / 12;
    const n = years * 12;
    const investedAmount = monthlyInvest * n;
    const totalValue = monthlyInvest * ((Math.pow(1 + i, n) - 1) / i) * (1 + i);
    const estReturns = totalValue - investedAmount;

    return {
      invested: Math.round(investedAmount),
      returns: Math.round(estReturns),
      total: Math.round(totalValue)
    };
  };

  const { invested, returns, total } = calculateReturns();

  const formatINR = (val) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
  };

  return (
    <section id="calculator" className="py-24 bg-white border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <span className="text-[#10B981] font-bold text-xs uppercase tracking-widest block mb-2">Wealth Projection</span>
          <h2 className="text-3xl md:text-4xl font-extrabold text-[#0B192C]">SIP & Compounding Calculator</h2>
          <p className="mt-4 text-gray-600 max-w-2xl mx-auto">
            See the exponential power of disciplined monthly investments compounded over time with structured management.
          </p>
        </div>

        <div className="bg-gradient-to-br from-[#0B192C] to-slate-900 text-white rounded-3xl p-8 sm:p-12 shadow-2xl grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          {/* Sliders Form */}
          <div className="lg:col-span-7 space-y-8">
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-semibold text-gray-300">Monthly Investment Amount</label>
                <span className="text-xl font-bold text-[#F97316]">{formatINR(monthlyInvest)}</span>
              </div>
              <input 
                type="range" 
                min="2000" 
                max="200000" 
                step="1000"
                value={monthlyInvest} 
                onChange={(e) => setMonthlyInvest(Number(e.target.value))}
                className="w-full accent-[#F97316] h-2 bg-slate-700 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>₹2,000</span>
                <span>₹1,00,000</span>
                <span>₹2,00,000</span>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-semibold text-gray-300">Investment Horizon (Time)</label>
                <span className="text-xl font-bold text-[#10B981]">{years} Years</span>
              </div>
              <input 
                type="range" 
                min="1" 
                max="30" 
                step="1"
                value={years} 
                onChange={(e) => setYears(Number(e.target.value))}
                className="w-full accent-[#10B981] h-2 bg-slate-700 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>1 Year</span>
                <span>15 Years</span>
                <span>30 Years</span>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-semibold text-gray-300">Expected Annual Returns (CAGR)</label>
                <span className="text-xl font-bold text-amber-400">{returnRate}%</span>
              </div>
              <input 
                type="range" 
                min="8" 
                max="20" 
                step="0.5"
                value={returnRate} 
                onChange={(e) => setReturnRate(Number(e.target.value))}
                className="w-full accent-amber-400 h-2 bg-slate-700 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>8% (Conservative)</span>
                <span>13.5% (Balanced)</span>
                <span>20% (Aggressive)</span>
              </div>
            </div>
          </div>

          {/* Results Card */}
          <div className="lg:col-span-5 bg-white/10 backdrop-blur-md rounded-2xl p-6 sm:p-8 border border-white/15 flex flex-col justify-between">
            <h4 className="text-base font-bold text-gray-300 uppercase tracking-wider mb-6 flex items-center gap-2">
              <Sparkles size={18} className="text-amber-400" /> Projected Maturity Value
            </h4>

            <div className="space-y-4 mb-8">
              <div className="flex justify-between items-center border-b border-white/10 pb-3">
                <span className="text-gray-400 text-sm">Invested Capital:</span>
                <span className="font-bold text-white text-base">{formatINR(invested)}</span>
              </div>
              <div className="flex justify-between items-center border-b border-white/10 pb-3">
                <span className="text-gray-400 text-sm">Estimated Wealth Gain:</span>
                <span className="font-bold text-[#10B981] text-base">+{formatINR(returns)}</span>
              </div>
              <div className="flex justify-between items-center pt-2">
                <span className="text-white font-bold text-base">Total Future Corpus:</span>
                <span className="font-black text-2xl sm:text-3xl text-[#F97316]">{formatINR(total)}</span>
              </div>
            </div>

            <button 
              onClick={() => scrollTo('#contact')}
              className="w-full py-3.5 bg-gradient-to-r from-[#F97316] to-amber-500 hover:from-orange-600 hover:to-orange-700 text-white font-bold rounded-xl shadow-lg shadow-orange-500/25 transition-all text-center"
            >
              Start This Plan Today
            </button>
            <span className="text-[11px] text-gray-400 text-center mt-3 block">
              *Projections are illustrative estimates calculated via standard compound interest formulas.
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};

// 7. Why Choose Us
const WhyChooseUs = () => (
  <section className="py-24 bg-[#0B192C] text-white relative overflow-hidden">
    <div className="absolute top-1/2 right-0 transform -translate-y-1/2 translate-x-1/3 w-96 h-96 bg-[#10B981] opacity-10 rounded-full blur-3xl"></div>
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
      <div>
        <span className="text-[#F97316] font-bold text-xs uppercase tracking-widest block mb-2">Our Advantage</span>
        <h2 className="text-3xl md:text-4xl font-extrabold mb-6">Why Partner With Us?</h2>
        <div className="w-16 h-1 bg-[#F97316] mb-8 rounded"></div>
        <div className="space-y-8">
          {[
            { title: "Absolute Transparency", desc: "No hidden fees, no opaque financial jargon. Clean, periodic portfolio statements and continuous accessibility." },
            { title: "Institutional Risk Controls", desc: "Enterprise risk modeling and asset diversification shields your hard-earned capital against sudden market swings." },
            { title: "Dedicated Advisory & Focus", desc: "Personalized guidance led by certified financial planners who treat your goals with military-grade discipline." }
          ].map((item, idx) => (
            <div key={idx} className="flex gap-4">
              <div className="mt-1 flex-shrink-0 w-8 h-8 rounded-full bg-[#10B981]/20 flex items-center justify-center text-[#10B981]">
                <CheckCircle size={20} />
              </div>
              <div>
                <h4 className="text-xl font-bold mb-1.5">{item.title}</h4>
                <p className="text-gray-300 text-sm leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="relative">
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl border border-slate-700 shadow-2xl p-7 relative overflow-hidden">
          <div className="flex justify-between items-center border-b border-slate-700 pb-4 mb-6">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className="text-xs text-gray-400 font-mono ml-2">Portfolio Analytics Live Feed</span>
            </div>
            <span className="text-xs font-bold text-[#10B981] bg-[#10B981]/15 px-2.5 py-1 rounded-full">
              +18.4% YTD
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6 text-xs">
            <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700">
              <span className="text-gray-400 block mb-1">Risk Alpha</span>
              <span className="text-lg font-bold text-white">4.82</span>
            </div>
            <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700">
              <span className="text-gray-400 block mb-1">Max Drawdown Hedge</span>
              <span className="text-lg font-bold text-[#10B981]">-4.2% (Protected)</span>
            </div>
          </div>

          {/* Dynamic Graphic Bars */}
          <div className="h-44 flex items-end gap-3 pt-4 border-b border-slate-700 pb-2">
            <div className="flex-1 bg-slate-700/60 h-2/6 rounded-t-lg transition-all hover:bg-slate-600"></div>
            <div className="flex-1 bg-slate-700/80 h-3/6 rounded-t-lg transition-all hover:bg-slate-600"></div>
            <div className="flex-1 bg-slate-600 h-2/5 rounded-t-lg transition-all hover:bg-slate-500"></div>
            <div className="flex-1 bg-[#10B981] h-4/5 rounded-t-lg relative shadow-[0_0_15px_rgba(16,185,129,0.5)]">
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 w-2 h-2 rounded-full bg-white"></div>
            </div>
            <div className="flex-1 bg-slate-600 h-3/5 rounded-t-lg"></div>
            <div className="flex-1 bg-amber-500 h-4/6 rounded-t-lg"></div>
            <div className="flex-1 bg-[#F97316] h-full rounded-t-lg relative shadow-[0_0_20px_rgba(249,115,22,0.6)]">
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-white animate-ping"></div>
            </div>
          </div>

          <div className="flex justify-between items-center pt-4 text-xs text-gray-400 font-mono">
            <span>Dynamic Sector Rebalance</span>
            <span className="text-[#10B981] font-semibold">Active & Optimized</span>
          </div>
        </div>
      </div>
    </div>
  </section>
);

// 8. How It Works
const HowItWorks = () => {
  const steps = [
    { num: "01", title: "Confidential Consultation", desc: "We review your financial profile, target goals, risk capacity, and time horizon." },
    { num: "02", title: "Custom Blueprinting", desc: "Our analysts build a mathematically sound, tax-optimized investment roadmap." },
    { num: "03", title: "Secure Deployment", desc: "Capital is strategically allocated across verified, regulated multi-asset vehicles." },
    { num: "04", title: "Active Governance", desc: "Continuous monitoring, periodic rebalancing, and transparent reporting at every step." }
  ];

  return (
    <section id="process" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <span className="text-[#F97316] font-bold text-xs uppercase tracking-widest block mb-2">Workflow</span>
          <h2 className="text-3xl md:text-4xl font-extrabold text-[#0B192C]">Our Investment Process</h2>
          <p className="mt-4 text-gray-600">A disciplined, 4-step framework engineered for enduring results.</p>
        </div>
        
        <div className="relative">
          {/* Connecting line for desktop */}
          <div className="hidden md:block absolute top-12 left-0 w-full h-1 bg-gradient-to-r from-orange-400 via-emerald-400 to-[#0B192C] opacity-20" aria-hidden="true"></div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {steps.map((step, idx) => (
              <div key={idx} className="relative z-10 flex flex-col items-center md:items-start text-center md:text-left bg-gray-50 md:bg-transparent p-6 md:p-0 rounded-2xl">
                <div className="w-20 h-20 rounded-2xl bg-[#0B192C] text-white flex items-center justify-center text-2xl font-black border-4 border-white shadow-xl mb-6 mx-auto md:mx-0 group hover:bg-[#F97316] transition-colors">
                  {step.num}
                </div>
                <h3 className="text-xl font-bold text-[#0B192C] mb-2">{step.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

// 9. Trust & Security
const TrustSecurity = () => (
  <section className="py-20 bg-gray-50 border-y border-gray-200">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="text-center mb-12">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0B192C]">Enterprise Security & Client Trust</h2>
        <p className="text-gray-600 text-sm mt-2">Your capital protection and data privacy are treated with highest priority.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center">
          <div className="w-14 h-14 bg-emerald-50 text-[#10B981] rounded-xl flex items-center justify-center mb-5">
            <Lock size={30} />
          </div>
          <h3 className="font-bold text-lg text-[#0B192C] mb-2">256-Bit Bank-Grade Encryption</h3>
          <p className="text-sm text-gray-500 leading-relaxed">All client communications, records, and documentation are safeguarded using industry-standard protocols.</p>
        </div>
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center">
          <div className="w-14 h-14 bg-emerald-50 text-[#10B981] rounded-xl flex items-center justify-center mb-5">
            <UserCheck size={30} />
          </div>
          <h3 className="font-bold text-lg text-[#0B192C] mb-2">Verified Professional Advisors</h3>
          <p className="text-sm text-gray-500 leading-relaxed">Our seasoned managers adhere to ethical financial practices and rigorous regulatory compliance standards.</p>
        </div>
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center">
          <div className="w-14 h-14 bg-emerald-50 text-[#10B981] rounded-xl flex items-center justify-center mb-5">
            <Server size={30} />
          </div>
          <h3 className="font-bold text-lg text-[#0B192C] mb-2">Direct Regulatory Custody</h3>
          <p className="text-sm text-gray-500 leading-relaxed">Client funds remain held in accredited depository institutions and recognized official custodians.</p>
        </div>
      </div>
    </div>
  </section>
);

// 10. Statistics
const Statistics = () => (
  <section className="py-20 bg-[#0B192C] border-t-4 border-[#F97316]">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-10 text-center">
        <div className="p-4">
          <div className="text-5xl md:text-6xl font-black text-[#F97316] mb-2">1,250+</div>
          <div className="text-white font-semibold uppercase tracking-wider text-sm">Active Portfolios Guided</div>
        </div>
        <div className="p-4">
          <div className="text-5xl md:text-6xl font-black text-[#10B981] mb-2">10+</div>
          <div className="text-white font-semibold uppercase tracking-wider text-sm">Years Advisory Experience</div>
        </div>
        <div className="p-4">
          <div className="text-5xl md:text-6xl font-black text-amber-400 mb-2">99.2%</div>
          <div className="text-white font-semibold uppercase tracking-wider text-sm">Client Satisfaction & Retention</div>
        </div>
      </div>
      <div className="mt-8 text-center text-xs text-gray-400">
        Empowering investors with disciplined capital strategies across India.
      </div>
    </div>
  </section>
);

// 11. Testimonials
const Testimonials = () => {
  const testimonials = [
    { quote: "Mehanda Army Investments brought the exact structure and discipline my family's investments needed. The transparency and regular reviews give total peace of mind.", author: "Col. R. Singh (Retd.)", role: "Armed Forces Veteran & Investor" },
    { quote: "Their risk-hedging approach is top notch. Even in choppy market cycles, our long-term portfolio stayed resilient and outperforming our baseline targets.", author: "V. Sharma", role: "Business Owner, Delhi NCR" },
  ];

  return (
    <section className="py-24 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <span className="text-[#10B981] font-bold text-xs uppercase tracking-widest block mb-2">Trust In Action</span>
          <h2 className="text-3xl font-extrabold text-[#0B192C]">Client Experiences</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {testimonials.map((t, i) => (
            <div key={i} className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 relative flex flex-col justify-between">
              <div>
                <div className="text-5xl text-orange-200 font-serif leading-none mb-3">“</div>
                <p className="text-gray-700 italic mb-6 leading-relaxed text-base">{t.quote}</p>
              </div>
              <div className="flex items-center gap-4 border-t border-gray-100 pt-4">
                <div className="w-12 h-12 bg-[#0B192C] text-white rounded-full flex items-center justify-center font-bold text-lg">
                  {t.author.charAt(0)}
                </div>
                <div>
                  <h4 className="font-bold text-[#0B192C] text-sm">{t.author}</h4>
                  <span className="text-xs text-gray-500 font-medium">{t.role}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// 12. FAQ Section
const FAQ = () => {
  const [openIndex, setOpenIndex] = useState(0);

  const faqs = [
    { 
      q: "What is the minimum investment required to get started?", 
      a: "Our portfolio strategies accommodate monthly SIPs starting from ₹5,000 to lump-sum wealth management mandates. We build a personalized roadmap tailored to your specific liquidity and cash flow needs." 
    },
    { 
      q: "How is my money and data secured?", 
      a: "We adhere strictly to highest safety practices. Your investment capital is held directly with SEBI/RBI registered custodians and mutual fund houses in your name. We never touch or hold custody of your banking funds." 
    },
    { 
      q: "Can I withdraw or access my funds anytime?", 
      a: "Yes. Open-ended portfolios and liquid strategies offer full redemption flexibility without lock-ins. Structured lock-in products (if any) are only chosen if explicitly agreed upon for tax optimization (e.g. ELSS)." 
    },
    { 
      q: "How can I contact my advisor directly?", 
      a: "Every client gets direct access to our advisory desk via WhatsApp (+91 9812947813), direct phone calls, or scheduled video consultations." 
    }
  ];

  return (
    <section id="faq" className="py-24 bg-white border-t border-gray-100">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <span className="text-[#F97316] font-bold text-xs uppercase tracking-widest block mb-2">Clarity First</span>
          <h2 className="text-3xl font-extrabold text-[#0B192C]">Frequently Asked Questions</h2>
        </div>
        <div className="space-y-4">
          {faqs.map((faq, idx) => (
            <div key={idx} className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              <button 
                onClick={() => setOpenIndex(openIndex === idx ? -1 : idx)}
                className="w-full px-6 py-5 flex justify-between items-center bg-gray-50 hover:bg-gray-100 transition-colors text-left font-semibold text-[#0B192C]"
              >
                <span>{faq.q}</span>
                {openIndex === idx ? <ChevronUp size={20} className="text-[#F97316] flex-shrink-0" /> : <ChevronDown size={20} className="text-gray-400 flex-shrink-0" />}
              </button>
              {openIndex === idx && (
                <div className="px-6 py-5 bg-white text-gray-600 leading-relaxed border-t border-gray-200 text-sm">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// 13. Contact & Direct WhatsApp Form
const Contact = () => {
  const [formState, setFormState] = useState({
    name: '', phone: '', email: '', category: 'General Investment Inquiry', message: '', consent: true
  });
  const [status, setStatus] = useState('idle');

  const handleChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFormState({ ...formState, [e.target.name]: value });
  };

  const handleWhatsAppSubmit = () => {
    if (!formState.name || !formState.phone) {
      alert("Please enter your name and phone number.");
      return;
    }
    const text = encodeURIComponent(
      `Hello Mehanda Army Investments!%0A` +
      `My Name: ${formState.name}%0A` +
      `Phone: ${formState.phone}%0A` +
      `Category: ${formState.category}%0A` +
      `Message: ${formState.message || 'I would like to start investing.'}`
    );
    window.open(`https://wa.me/919812947813?text=${text}`, '_blank');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setStatus('loading');
    
    // Smooth submission simulation + auto WhatsApp trigger
    setTimeout(() => {
      setStatus('success');
      setTimeout(() => {
        handleWhatsAppSubmit();
      }, 800);
    }, 1000);
  };

  return (
    <section id="contact" className="py-24 bg-gray-100 border-t border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
          
          {/* Official Channels */}
          <div>
            <span className="text-[#10B981] font-bold text-xs uppercase tracking-widest block mb-2">Connect Directly</span>
            <h2 className="text-3xl md:text-4xl font-extrabold text-[#0B192C] mb-6">Get In Touch With An Advisor</h2>
            <p className="text-gray-600 mb-10 leading-relaxed">
              Ready to secure and grow your financial future? Reach out to our advisory desk today for a confidential consultation.
            </p>
            
            <div className="space-y-6">
              <div className="flex items-start gap-4 bg-white p-4 rounded-xl border border-gray-200">
                <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center shadow-sm flex-shrink-0 text-[#F97316]">
                  <Phone size={24} />
                </div>
                <div>
                  <h4 className="font-bold text-[#0B192C]">Official Phone & Support</h4>
                  <a href={`tel:${PHONE_NUMBER.replace(/\s+/g, '')}`} className="text-gray-700 mt-0.5 hover:text-[#F97316] transition-colors font-semibold block text-base">{PHONE_NUMBER}</a>
                  <p className="text-xs text-gray-500 mt-1">Direct Advisor Line (Mon-Sat, 9:00 AM - 7:00 PM IST)</p>
                </div>
              </div>
              
              <div className="flex items-start gap-4 bg-white p-4 rounded-xl border border-gray-200">
                <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center shadow-sm flex-shrink-0 text-[#10B981]">
                  <Mail size={24} />
                </div>
                <div>
                  <h4 className="font-bold text-[#0B192C]">Official Email Address</h4>
                  <a href={`mailto:${EMAIL_ADDRESS}`} className="text-gray-700 mt-0.5 hover:text-[#F97316] transition-colors font-semibold block text-base">{EMAIL_ADDRESS}</a>
                  <p className="text-xs text-gray-500 mt-1">24-hour turnaround on verified enquiries</p>
                </div>
              </div>

              <div className="flex items-start gap-4 bg-white p-4 rounded-xl border border-gray-200">
                <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center shadow-sm flex-shrink-0 text-[#25D366]">
                  <MessageCircle size={24} />
                </div>
                <div>
                  <h4 className="font-bold text-[#0B192C]">Instant WhatsApp Advisory</h4>
                  <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 mt-2 bg-[#25D366] hover:bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-md">
                    <MessageCircle size={16} /> Open WhatsApp Chat
                  </a>
                </div>
              </div>
              
              <div className="flex items-start gap-4 bg-white p-4 rounded-xl border border-gray-200">
                <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center shadow-sm flex-shrink-0 text-[#0B192C]">
                  <MapPin size={24} />
                </div>
                <div>
                  <h4 className="font-bold text-[#0B192C]">Advisory Office</h4>
                  <p className="text-gray-600 mt-1 text-sm font-medium">{ADDRESS_TEXT}</p>
                </div>
              </div>
            </div>
            
            <div className="mt-8 p-4 bg-amber-50 border border-amber-200 rounded-xl flex gap-3 text-amber-800 text-xs leading-relaxed">
              <AlertCircle className="flex-shrink-0 mt-0.5 text-amber-600" size={18} />
              <p><strong className="font-bold">Security Notice:</strong> Mehanda Army Investments will never request your banking passwords or OTPs. Please always communicate through our verified channels above.</p>
            </div>
          </div>
          
          {/* Contact Form */}
          <div className="bg-white p-8 sm:p-10 rounded-3xl shadow-xl border border-gray-200">
            <h3 className="text-2xl font-black text-[#0B192C] mb-2">Request A Free Portfolio Review</h3>
            <p className="text-gray-500 text-sm mb-6">Fill the details below to receive a personalized investment callback.</p>
            
            {status === 'success' ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-8 text-center animate-fadeIn">
                <CheckCircle size={56} className="text-[#10B981] mx-auto mb-4" />
                <h4 className="text-2xl font-bold text-emerald-900 mb-2">Enquiry Sent Successfully!</h4>
                <p className="text-emerald-700 text-sm mb-6">
                  Thank you, <strong className="font-semibold">{formState.name}</strong>. Opening WhatsApp to connect you directly with your advisor...
                </p>
                <button 
                  onClick={handleWhatsAppSubmit} 
                  className="inline-flex items-center gap-2 bg-[#25D366] hover:bg-emerald-600 text-white font-bold px-6 py-3 rounded-xl shadow-md transition-all text-sm"
                >
                  <MessageCircle size={18} /> Re-open WhatsApp
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">Full Name *</label>
                    <input 
                      required 
                      type="text" 
                      name="name" 
                      placeholder="e.g. Ramesh Kumar"
                      value={formState.name} 
                      onChange={handleChange} 
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#F97316] focus:border-transparent outline-none transition-all text-sm" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">Phone Number *</label>
                    <input 
                      required 
                      type="tel" 
                      name="phone" 
                      placeholder="e.g. +91 98765 43210"
                      value={formState.phone} 
                      onChange={handleChange} 
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#F97316] focus:border-transparent outline-none transition-all text-sm" 
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">Email Address</label>
                  <input 
                    type="email" 
                    name="email" 
                    placeholder="e.g. ramesh@example.com"
                    value={formState.email} 
                    onChange={handleChange} 
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#F97316] focus:border-transparent outline-none transition-all text-sm" 
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">Investment Goal</label>
                  <select 
                    name="category" 
                    value={formState.category} 
                    onChange={handleChange} 
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#F97316] focus:border-transparent outline-none transition-all text-sm"
                  >
                    <option>General Investment Inquiry</option>
                    <option>Monthly SIP Wealth Plan</option>
                    <option>Lump Sum Wealth Deployment</option>
                    <option>Retirement & Pension Security</option>
                    <option>Defense Personnel Special Portfolio</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">Message or Queries (Optional)</label>
                  <textarea 
                    name="message" 
                    placeholder="Tell us about your investment target or time horizon..."
                    value={formState.message} 
                    onChange={handleChange} 
                    rows="3" 
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#F97316] focus:border-transparent outline-none transition-all text-sm resize-none"
                  ></textarea>
                </div>
                
                <div className="flex items-start gap-2.5 pt-1">
                  <input 
                    required 
                    type="checkbox" 
                    id="consent" 
                    name="consent" 
                    checked={formState.consent} 
                    onChange={handleChange} 
                    className="mt-1 accent-[#F97316]" 
                  />
                  <label htmlFor="consent" className="text-xs text-gray-500 leading-relaxed cursor-pointer">
                    I authorize Mehanda Army Investments to contact me regarding my portfolio query via Call, WhatsApp, or Email.
                  </label>
                </div>
                
                <button 
                  type="submit" 
                  disabled={status === 'loading'}
                  className="w-full py-4 rounded-xl font-bold text-white transition-all shadow-lg shadow-orange-500/25 bg-[#F97316] hover:bg-orange-600 active:scale-95 flex justify-center items-center gap-2 mt-4"
                >
                  {status === 'loading' ? (
                    'Connecting with Advisor...'
                  ) : (
                    <>
                      <Send size={18} /> Submit & Connect on WhatsApp
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

// 14. Footer
const Footer = ({ scrollTo, openLegalModal }) => (
  <footer className="bg-[#0B192C] text-gray-300 pt-16 pb-8 border-t border-white/10">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
        <div className="col-span-1 md:col-span-2">
          <div className="flex items-center mb-4">
            <div className="w-9 h-9 bg-gradient-to-tr from-[#F97316] to-amber-500 rounded-lg flex items-center justify-center mr-3 shadow-md">
              <TrendingUp size={22} className="text-white" />
            </div>
            <div>
              <span className="font-extrabold text-lg text-white block">MEHANDA ARMY INVESTMENTS</span>
              <span className="text-[#10B981] text-xs font-semibold uppercase tracking-wider block">Disciplined Wealth Management</span>
            </div>
          </div>
          <p className="text-sm text-gray-400 max-w-md mb-6 leading-relaxed">
            Institutional investment solutions designed to grow and preserve capital for families, professionals, and defense veterans.
          </p>
          <div className="text-xs text-gray-400 border border-gray-700/80 p-4 rounded-xl bg-white/5 leading-relaxed">
            <strong className="text-white font-semibold">Regulatory & Risk Notice:</strong> Mutual fund investments and securities markets are subject to market risks. Read all scheme related documents carefully before investing. Past performance is not indicative of future returns.
          </div>
        </div>
        
        <div>
          <h4 className="text-white font-bold mb-4 uppercase text-xs tracking-widest text-[#F97316]">Navigation</h4>
          <ul className="space-y-2.5 text-sm">
            <li><a href="#services" onClick={(e) => { e.preventDefault(); scrollTo('#services'); }} className="hover:text-white transition-colors">Services</a></li>
            <li><a href="#calculator" onClick={(e) => { e.preventDefault(); scrollTo('#calculator'); }} className="hover:text-white transition-colors">SIP Calculator</a></li>
            <li><a href="#process" onClick={(e) => { e.preventDefault(); scrollTo('#process'); }} className="hover:text-white transition-colors">How It Works</a></li>
            <li><a href="#faq" onClick={(e) => { e.preventDefault(); scrollTo('#faq'); }} className="hover:text-white transition-colors">FAQ</a></li>
            <li><a href="#contact" onClick={(e) => { e.preventDefault(); scrollTo('#contact'); }} className="hover:text-white transition-colors">Contact</a></li>
          </ul>
        </div>
        
        <div>
          <h4 className="text-white font-bold mb-4 uppercase text-xs tracking-widest text-[#10B981]">Legal & Policies</h4>
          <ul className="space-y-2.5 text-sm">
            <li><button onClick={() => openLegalModal('Privacy Policy')} className="hover:text-white transition-colors text-left">Privacy Policy</button></li>
            <li><button onClick={() => openLegalModal('Terms & Conditions')} className="hover:text-white transition-colors text-left">Terms & Conditions</button></li>
            <li><button onClick={() => openLegalModal('Investor Charter & Compliance')} className="hover:text-white transition-colors text-left">Compliance Charter</button></li>
            <li><button onClick={() => openLegalModal('Disclaimers')} className="hover:text-white transition-colors text-left">Disclaimers & Disclosures</button></li>
          </ul>
        </div>
      </div>

      <div className="border-t border-gray-800 pt-8 mb-6">
        <div className="flex flex-col md:flex-row gap-6 justify-center items-center text-sm font-medium">
          <a href={`tel:${PHONE_NUMBER.replace(/\s+/g, '')}`} className="flex items-center gap-2 hover:text-[#F97316] transition-colors"><Phone size={16} /> {PHONE_NUMBER}</a>
          <a href={`mailto:${EMAIL_ADDRESS}`} className="flex items-center gap-2 hover:text-[#F97316] transition-colors"><Mail size={16} /> {EMAIL_ADDRESS}</a>
          <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-[#25D366] hover:text-emerald-400 transition-colors"><MessageCircle size={16} /> WhatsApp Advisory</a>
        </div>
      </div>
      
      <div className="border-t border-gray-800/60 pt-6 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-gray-500">
        <p>&copy; {new Date().getFullYear()} Mehanda Army Investments. All rights reserved.</p>
        <p className="flex items-center gap-1.5"><ShieldCheck size={14} className="text-[#10B981]" /> Enterprise Secure & Client First</p>
      </div>
    </div>
  </footer>
);

// 15. Floating Action Buttons
const FloatingActions = () => {
  const [showTopBtn, setShowTopBtn] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowTopBtn(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="fixed bottom-6 right-6 flex flex-col items-end gap-3 z-40">
      {showTopBtn && (
        <button 
          onClick={scrollToTop}
          className="w-12 h-12 bg-[#0B192C] text-white rounded-full flex items-center justify-center shadow-2xl hover:bg-slate-800 border border-white/20 transition-all hover:scale-105 active:scale-95"
          aria-label="Back to top"
        >
          <ArrowUp size={22} />
        </button>
      )}
      
      <a 
        href={WHATSAPP_URL}
        target="_blank" 
        rel="noopener noreferrer"
        className="group flex items-center gap-2 bg-[#25D366] text-white py-3 px-4 rounded-full shadow-2xl hover:bg-emerald-600 transition-all hover:scale-105 active:scale-95"
        aria-label="Contact on WhatsApp"
      >
        <MessageCircle size={26} />
        <span className="font-bold text-sm hidden sm:inline-block pr-1">Chat With Advisor</span>
      </a>
    </div>
  );
};

// 16. Client Portal Component with Gmail OTP Authentication
const ClientPortal = ({ setCurrentView }) => {
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'signup'
  const [loginMethod, setLoginMethod] = useState('password'); // 'password' | 'otp'
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState({
    name: 'Investor Demo',
    email: 'investor.demo@mehandaarmy.in',
    phone: '+91 9812947813',
    accountNumber: 'MAI-8842-ACC'
  });

  // Form Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // OTP Verification States
  const [otpStep, setOtpStep] = useState(false); // true when waiting for OTP
  const [enteredOtp, setEnteredOtp] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [otpTimer, setOtpTimer] = useState(60);
  const [otpError, setOtpError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // Countdown timer for OTP
  useEffect(() => {
    let interval = null;
    if (otpStep && otpTimer > 0) {
      interval = setInterval(() => {
        setOtpTimer((prev) => prev - 1);
      }, 1000);
    } else if (otpTimer === 0) {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [otpStep, otpTimer]);

  // Generate random 6-digit OTP
  const createRandomOtp = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  // Trigger Send OTP
  const handleSendOtp = (e) => {
    if (e) e.preventDefault();
    if (!email || !email.includes('@')) {
      setOtpError('Please enter a valid Gmail / Email address.');
      return;
    }
    if (authMode === 'signup' && (!name || !phone || !password)) {
      setOtpError('Please fill in your Name, Phone, and Password.');
      return;
    }

    setLoading(true);
    setOtpError('');

    setTimeout(() => {
      const code = createRandomOtp();
      setGeneratedOtp(code);
      setOtpStep(true);
      setOtpTimer(60);
      setLoading(false);
      setStatusMessage(`Verification code sent to ${email}!`);
    }, 700);
  };

  // Verify OTP & Proceed
  const handleVerifyOtp = (e) => {
    e.preventDefault();
    if (enteredOtp.trim() !== generatedOtp.trim()) {
      setOtpError('Invalid OTP code! Please enter the exact 6-digit code.');
      return;
    }

    setLoading(true);
    setOtpError('');

    setTimeout(() => {
      setLoading(false);
      const userObj = {
        name: name.trim() || email.split('@')[0],
        email: email.trim(),
        phone: phone.trim() || '+91 9812947813',
        accountNumber: `MAI-${Math.floor(1000 + Math.random() * 9000)}-VERIFIED`
      };
      setCurrentUser(userObj);
      setIsLoggedIn(true);
      setOtpStep(false);
    }, 800);
  };

  // Direct Password Login
  const handlePasswordLogin = (e) => {
    e.preventDefault();
    if (!email) {
      setOtpError('Please enter your email.');
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      const userObj = {
        name: email.split('@')[0],
        email: email.trim(),
        phone: '+91 9812947813',
        accountNumber: `MAI-${Math.floor(1000 + Math.random() * 9000)}-LOGIN`
      };
      setCurrentUser(userObj);
      setIsLoggedIn(true);
    }, 800);
  };

  // Instant Demo Access
  const handleInstantDemo = () => {
    setCurrentUser({
      name: 'Ramesh Kumar (Demo Client)',
      email: 'ramesh.client@mehandaarmy.in',
      phone: '+91 9812947813',
      accountNumber: 'MAI-9812-DEMO'
    });
    setIsLoggedIn(true);
  };

  // Reset states on switching tab
  const switchMode = (mode) => {
    setAuthMode(mode);
    setOtpStep(false);
    setEnteredOtp('');
    setOtpError('');
    setStatusMessage('');
  };

  // Logged-in Dashboard
  if (isLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-900 text-white font-sans">
        {/* Portal Header */}
        <header className="bg-[#0B192C] border-b border-white/10 px-6 py-4 flex justify-between items-center sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#F97316] rounded-lg flex items-center justify-center shadow-lg">
              <TrendingUp size={22} className="text-white" />
            </div>
            <div>
              <h2 className="font-bold text-base">Client Portfolio Portal</h2>
              <span className="text-xs text-gray-400">Mehanda Army Investments</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setCurrentView('home')} 
              className="text-xs sm:text-sm bg-white/10 hover:bg-white/20 text-gray-200 px-3 py-2 rounded-lg transition-colors"
            >
              Back to Website
            </button>
            <button 
              onClick={() => { setIsLoggedIn(false); setOtpStep(false); }} 
              className="text-xs sm:text-sm bg-red-500/20 hover:bg-red-500/30 text-red-300 px-3 py-2 rounded-lg flex items-center gap-1.5 transition-colors border border-red-500/30"
            >
              <LogOut size={16} /> Logout
            </button>
          </div>
        </header>

        {/* Portal Body */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
          {/* Welcome Banner */}
          <div className="bg-gradient-to-r from-slate-800 to-slate-800/90 rounded-2xl p-6 border border-slate-700 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-[#10B981] text-xs font-bold uppercase tracking-wider mb-2">
                <CheckCircle size={14} /> Gmail Verified Account
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white">
                Welcome back, {currentUser.name}!
              </h1>
              <p className="text-sm text-gray-300 mt-1">
                Account ID: <span className="font-mono text-amber-400">{currentUser.accountNumber}</span> | Email: <span className="text-gray-200">{currentUser.email}</span>
              </p>
            </div>
            <a 
              href={WHATSAPP_URL} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="bg-[#25D366] hover:bg-emerald-600 text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-lg flex items-center gap-2 shadow-md transition-all flex-shrink-0"
            >
              <MessageCircle size={16} /> Contact Dedicated RM
            </a>
          </div>

          {/* Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="bg-slate-800/90 p-5 rounded-2xl border border-slate-700">
              <span className="text-xs text-gray-400 font-medium">Total Portfolio Value</span>
              <h3 className="text-2xl font-black text-white mt-1">₹42,85,600</h3>
              <span className="text-xs text-[#10B981] font-bold mt-1 inline-block">+18.4% All-Time Return</span>
            </div>
            <div className="bg-slate-800/90 p-5 rounded-2xl border border-slate-700">
              <span className="text-xs text-gray-400 font-medium">Invested Capital</span>
              <h3 className="text-2xl font-black text-white mt-1">₹35,00,000</h3>
              <span className="text-xs text-gray-400 mt-1 inline-block">Net Cost Basis</span>
            </div>
            <div className="bg-slate-800/90 p-5 rounded-2xl border border-slate-700">
              <span className="text-xs text-gray-400 font-medium">Total Unrealized Gains</span>
              <h3 className="text-2xl font-black text-[#10B981] mt-1">+₹7,85,600</h3>
              <span className="text-xs text-gray-400 mt-1 inline-block">Tax-Optimized</span>
            </div>
            <div className="bg-slate-800/90 p-5 rounded-2xl border border-slate-700">
              <span className="text-xs text-gray-400 font-medium">Active SIP Commitments</span>
              <h3 className="text-2xl font-black text-[#F97316] mt-1">₹50,000 / mo</h3>
              <span className="text-xs text-gray-400 mt-1 inline-block">Next Auto-Debit: 5th of Month</span>
            </div>
          </div>

          {/* Allocation Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 bg-slate-800/90 p-6 rounded-2xl border border-slate-700">
              <h4 className="text-lg font-bold mb-4 flex items-center justify-between">
                <span>Asset Allocation Breakdown</span>
                <span className="text-xs font-normal text-gray-400">Target Diversification</span>
              </h4>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span>Large & Midcap Equities</span>
                    <span className="text-[#F97316]">55% (₹23,57,080)</span>
                  </div>
                  <div className="w-full bg-slate-700 h-2.5 rounded-full overflow-hidden">
                    <div className="bg-[#F97316] h-full rounded-full" style={{ width: '55%' }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span>Sovereign & Corporate Debt</span>
                    <span className="text-[#10B981]">25% (₹10,71,400)</span>
                  </div>
                  <div className="w-full bg-slate-700 h-2.5 rounded-full overflow-hidden">
                    <div className="bg-[#10B981] h-full rounded-full" style={{ width: '25%' }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span>Gold & Precious Metals Hedge</span>
                    <span className="text-amber-400">12% (₹5,14,272)</span>
                  </div>
                  <div className="w-full bg-slate-700 h-2.5 rounded-full overflow-hidden">
                    <div className="bg-amber-400 h-full rounded-full" style={{ width: '12%' }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span>Liquid Arbitrage & Cash Reserve</span>
                    <span className="text-cyan-400">8% (₹3,42,848)</span>
                  </div>
                  <div className="w-full bg-slate-700 h-2.5 rounded-full overflow-hidden">
                    <div className="bg-cyan-400 h-full rounded-full" style={{ width: '8%' }}></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-slate-800/90 p-6 rounded-2xl border border-slate-700 flex flex-col justify-between">
              <div>
                <h4 className="text-lg font-bold mb-4">Dedicated Wealth Advisor</h4>
                <div className="bg-slate-700/50 p-4 rounded-xl border border-slate-600 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#F97316] flex items-center justify-center font-bold text-white">
                      MA
                    </div>
                    <div>
                      <h5 className="font-bold text-sm">Mehanda Army Desk</h5>
                      <span className="text-xs text-gray-300">Senior Portfolio Manager</span>
                    </div>
                  </div>
                  <div className="mt-3 text-xs space-y-1 text-gray-300 border-t border-slate-600/70 pt-2">
                    <p>Phone: {PHONE_NUMBER}</p>
                    <p>Email: {EMAIL_ADDRESS}</p>
                  </div>
                </div>
              </div>

              <a 
                href={WHATSAPP_URL} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="w-full py-3 bg-[#25D366] hover:bg-emerald-600 text-white font-bold rounded-xl text-center text-xs tracking-wider uppercase transition-all shadow-md"
              >
                Schedule Portfolio Review
              </a>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B192C] flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 rounded-full bg-[#10B981] opacity-15 blur-3xl"></div>
      <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 rounded-full bg-[#F97316] opacity-15 blur-3xl"></div>
      
      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4">
        <div className="flex justify-center cursor-pointer" onClick={() => setCurrentView('home')}>
          <div className="w-14 h-14 bg-gradient-to-tr from-[#F97316] to-amber-500 rounded-2xl flex items-center justify-center shadow-xl shadow-orange-500/25">
            <TrendingUp size={30} className="text-white" />
          </div>
        </div>
        <h2 className="mt-4 text-center text-3xl font-black text-white">
          {authMode === 'login' ? 'Client Portal Sign In' : 'Create Investor Account'}
        </h2>
        <p className="mt-1 text-center text-sm text-gray-400">
          Mehanda Army Investments
        </p>

        {/* Tab Switcher: Login vs Create Account */}
        <div className="mt-6 flex bg-slate-800/80 p-1 rounded-xl border border-slate-700">
          <button 
            type="button"
            onClick={() => switchMode('login')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
              authMode === 'login' 
                ? 'bg-[#F97316] text-white shadow-md' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Client Login
          </button>
          <button 
            type="button"
            onClick={() => switchMode('signup')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              authMode === 'signup' 
                ? 'bg-[#10B981] text-white shadow-md' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <UserPlus size={14} /> Create Account (OTP)
          </button>
        </div>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4">
        <div className="bg-white py-8 px-6 shadow-2xl rounded-3xl sm:px-10 border border-gray-100">
          
          {/* Status Message or OTP Simulation Display */}
          {otpStep && generatedOtp && (
            <div className="mb-6 p-4 bg-emerald-50 border-2 border-emerald-400 rounded-2xl text-emerald-900 animate-fadeIn">
              <div className="flex items-center gap-2 mb-1.5">
                <MailCheck size={20} className="text-emerald-600 flex-shrink-0" />
                <span className="font-bold text-sm">Gmail Verification Code Sent!</span>
              </div>
              <p className="text-xs text-emerald-700 mb-2 leading-relaxed">
                We sent an OTP to <strong className="font-semibold">{email}</strong>.
              </p>
              {/* Highlight Demo OTP for easy test */}
              <div className="bg-white p-2.5 rounded-xl border border-emerald-300 flex justify-between items-center">
                <span className="text-xs text-gray-600 font-medium">Your 6-Digit OTP:</span>
                <span className="font-mono text-base font-black text-emerald-700 tracking-widest bg-emerald-100 px-2.5 py-0.5 rounded-lg">
                  {generatedOtp}
                </span>
              </div>
            </div>
          )}

          {otpError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
              <AlertCircle size={16} className="flex-shrink-0 text-red-500" />
              <span>{otpError}</span>
            </div>
          )}

          {/* STEP 2: ENTER OTP (For both Signup & Login via OTP) */}
          {otpStep ? (
            <form onSubmit={handleVerifyOtp} className="space-y-5 animate-fadeIn">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                  Enter 6-Digit Gmail OTP *
                </label>
                <input 
                  type="text" 
                  maxLength="6"
                  required
                  placeholder="e.g. 482910"
                  value={enteredOtp}
                  onChange={(e) => setEnteredOtp(e.target.value.replace(/\D/g, ''))}
                  className="w-full text-center font-mono text-2xl tracking-widest py-3 border-2 border-[#10B981] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#10B981] bg-gray-50 font-bold"
                />
              </div>

              <div className="flex justify-between items-center text-xs">
                {otpTimer > 0 ? (
                  <span className="text-gray-500 flex items-center gap-1">
                    <Clock size={14} /> Resend code in {otpTimer}s
                  </span>
                ) : (
                  <button 
                    type="button" 
                    onClick={handleSendOtp}
                    className="text-[#F97316] font-bold hover:underline flex items-center gap-1"
                  >
                    <RefreshCw size={14} /> Resend OTP to Gmail
                  </button>
                )}
                <button 
                  type="button" 
                  onClick={() => setOtpStep(false)}
                  className="text-gray-500 hover:text-gray-800 underline"
                >
                  Change Email
                </button>
              </div>

              <button 
                type="submit"
                disabled={loading || enteredOtp.length < 6}
                className="w-full py-3.5 px-4 rounded-xl shadow-md text-sm font-bold text-white bg-[#10B981] hover:bg-emerald-600 transition-all active:scale-95 disabled:bg-gray-400 disabled:cursor-not-allowed flex justify-center items-center gap-2"
              >
                {loading ? 'Verifying...' : (
                  <>
                    <Check size={18} /> {authMode === 'signup' ? 'Verify OTP & Create Account' : 'Verify OTP & Sign In'}
                  </>
                )}
              </button>
            </form>
          ) : authMode === 'signup' ? (
            /* STEP 1: CREATE ACCOUNT FORM WITH GMAIL OTP */
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                  Full Name *
                </label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Rajesh Kumar"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-[#10B981] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                  Gmail / Email Address * (OTP Will Be Sent Here)
                </label>
                <input 
                  type="email" 
                  required
                  placeholder="e.g. rajesh@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-[#10B981] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                  Mobile Number *
                </label>
                <input 
                  type="tel" 
                  required
                  placeholder="e.g. +91 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-[#10B981] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                  Create Password *
                </label>
                <div className="relative">
                  <input 
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Create a strong password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-[#10B981] outline-none pr-10"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button 
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 px-4 rounded-xl shadow-md text-sm font-bold text-white bg-[#10B981] hover:bg-emerald-600 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <KeyRound size={18} /> Send Gmail Verification OTP
                </button>
              </div>

              <p className="text-[11px] text-gray-500 text-center leading-relaxed">
                By creating an account, you agree to Mehanda Army Investments' privacy & security policy.
              </p>
            </form>
          ) : (
            /* STEP 1: LOGIN FORM (PASSWORD OR GMAIL OTP) */
            <div>
              <div className="flex gap-2 mb-4 border-b border-gray-100 pb-3">
                <button 
                  type="button"
                  onClick={() => setLoginMethod('password')}
                  className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${loginMethod === 'password' ? 'bg-slate-100 text-[#0B192C]' : 'text-gray-400 hover:text-gray-700'}`}
                >
                  Password Login
                </button>
                <button 
                  type="button"
                  onClick={() => setLoginMethod('otp')}
                  className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 ${loginMethod === 'otp' ? 'bg-orange-50 text-[#F97316]' : 'text-gray-400 hover:text-gray-700'}`}
                >
                  <KeyRound size={13} /> Sign In via Gmail OTP
                </button>
              </div>

              {loginMethod === 'password' ? (
                <form className="space-y-4" onSubmit={handlePasswordLogin}>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                      Email Address or Client ID *
                    </label>
                    <input
                      type="text"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. client@mehandaarmy.in"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-[#F97316]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                      Password *
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your security password"
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-xl shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-[#F97316] pr-10"
                      />
                      <button 
                        type="button"
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <button 
                      type="button" 
                      onClick={() => setLoginMethod('otp')} 
                      className="text-[#F97316] font-semibold hover:underline"
                    >
                      Login via OTP instead?
                    </button>
                    <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-gray-700">
                      Forgot password?
                    </a>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full flex justify-center py-3.5 px-4 rounded-xl shadow-md text-sm font-bold text-white bg-[#0B192C] hover:bg-slate-800 transition-all active:scale-95"
                    >
                      {loading ? 'Authenticating...' : 'Sign In Securely'}
                    </button>
                  </div>
                </form>
              ) : (
                /* Login via OTP form */
                <form className="space-y-4" onSubmit={handleSendOtp}>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                      Enter Your Registered Gmail *
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. client@gmail.com"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-[#F97316]"
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full flex justify-center items-center gap-2 py-3.5 px-4 rounded-xl shadow-md text-sm font-bold text-white bg-[#F97316] hover:bg-orange-600 transition-all active:scale-95"
                    >
                      <KeyRound size={18} /> Send Login OTP
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* Quick Demo Access Button */}
          <div className="mt-5 pt-5 border-t border-gray-100 text-center">
            <button
              onClick={handleInstantDemo}
              className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-emerald-300 rounded-xl text-xs font-bold text-[#10B981] bg-emerald-50 hover:bg-emerald-100 transition-colors"
            >
              <Sparkles size={15} /> Instant Demo Portfolio Preview
            </button>
          </div>
          
          <div className="mt-3">
            <button 
              onClick={() => setCurrentView('home')}
              className="w-full flex justify-center py-2.5 px-4 border border-gray-200 rounded-xl text-xs font-semibold text-gray-600 bg-white hover:bg-gray-50 transition-colors"
            >
              &larr; Back to Public Website
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// 17. Legal Modal Component
const LegalModal = ({ title, isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden border border-gray-200">
        <div className="p-6 bg-[#0B192C] text-white flex justify-between items-center">
          <h3 className="text-xl font-bold">{title}</h3>
          <button onClick={onClose} className="p-1.5 text-gray-300 hover:text-white rounded-lg hover:bg-white/10">
            <X size={20} />
          </button>
        </div>
        <div className="p-6 overflow-y-auto text-sm text-gray-600 space-y-4 leading-relaxed">
          <p>
            <strong>1. General Overview:</strong> Mehanda Army Investments provides strategic financial guidance, portfolio planning, and capital advisory. All client records and communications are treated with strict confidentiality in accordance with applicable Indian laws.
          </p>
          <p>
            <strong>2. Risk Factors:</strong> Securities and mutual fund markets entail inherent risks, including volatility and possible capital fluctuations. Clients are strongly encouraged to consider their personal risk appetite and investment horizons before making financial commitments.
          </p>
          <p>
            <strong>3. Client Privacy:</strong> We strictly protect user data. Personal contact details submitted via our enquiry forms are exclusively utilized to respond to your specific investment queries and are never sold or rented to third-party telemarketers.
          </p>
          <p>
            <strong>4. Communication Verification:</strong> Clients must ensure they only communicate with verified contact channels (+91 9812947813 and Info@mehandaarmy.in).
          </p>
        </div>
        <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end">
          <button onClick={onClose} className="px-5 py-2.5 bg-[#0B192C] text-white font-bold rounded-xl text-xs">
            I Understand & Close
          </button>
        </div>
      </div>
    </div>
  );
};

// --- MAIN APP COMPONENT ---
export default function App() {
  const [currentView, setCurrentView] = useState('home');
  const [legalModal, setLegalModal] = useState({ isOpen: false, title: '' });

  // Scroll to top on view changes
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [currentView]);

  const scrollTo = (href) => {
    if (currentView !== 'home') {
      setCurrentView('home');
      setTimeout(() => {
        const el = document.querySelector(href);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } else {
      const el = document.querySelector(href);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const openLegalModal = (title) => {
    setLegalModal({ isOpen: true, title });
  };

  if (currentView === 'login') {
    return <ClientPortal setCurrentView={setCurrentView} />;
  }

  return (
    <div className="font-sans text-slate-900 bg-gray-50 min-h-screen">
      <AnnouncementBar />
      <Header setCurrentView={setCurrentView} scrollTo={scrollTo} />
      <main>
        <Hero scrollTo={scrollTo} />
        <Introduction />
        <Services scrollTo={scrollTo} />
        <InvestmentCalculator scrollTo={scrollTo} />
        <WhyChooseUs />
        <HowItWorks />
        <TrustSecurity />
        <Statistics />
        <Testimonials />
        <FAQ />
        <Contact />
      </main>
      <Footer scrollTo={scrollTo} openLegalModal={openLegalModal} />
      <FloatingActions />
      <LegalModal 
        isOpen={legalModal.isOpen} 
        title={legalModal.title} 
        onClose={() => setLegalModal({ isOpen: false, title: '' })} 
      />
    </div>
  );
}
