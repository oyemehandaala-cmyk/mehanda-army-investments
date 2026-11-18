import React from 'react';
import { 
  CreditCard, 
  ArrowLeft, 
  ShieldAlert, 
  Phone, 
  Mail, 
  Sparkles,
  TrendingUp,
  Home,
  Lock,
  LayoutDashboard
} from 'lucide-react';
import BrandVerificationBadge from './BrandVerificationBadge';

export default function PaymentCentre({ setCurrentView, currentUser }) {
  const handleBackHome = () => {
    if (setCurrentView) setCurrentView('home');
    else window.location.href = '/';
  };

  const handleGoDashboard = () => {
    if (setCurrentView) setCurrentView('client-dashboard');
    else window.location.href = '/dashboard';
  };

  return (
    <div 
      className="min-h-screen font-sans text-slate-100 flex flex-col justify-between"
      style={{
        background: 'radial-gradient(ellipse at 50% 0%, #152238 0%, #080e1b 50%, #03060c 100%)',
      }}
    >
      
      {/* Top Luxury Navigation Bar */}
      <header className="sticky top-0 z-30 bg-[#091122]/90 backdrop-blur-md border-b border-[#c5a880]/30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <button
            type="button"
            onClick={handleBackHome}
            className="flex items-center gap-2.5 text-left group focus:outline-none cursor-pointer"
            aria-label="Return to Mehanda Army Investments Home"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-700 via-blue-600 to-indigo-700 flex items-center justify-center shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform text-white border border-[#c5a880]/40">
              <TrendingUp size={18} strokeWidth={2.5} />
            </div>
            <div>
              <span className="block text-xs font-black tracking-widest text-white uppercase">
                MEHANDA ARMY
              </span>
              <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-blue-400">
                Investments
                <BrandVerificationBadge className="h-3.5 w-3.5" />
              </span>
            </div>
          </button>

          <div className="flex items-center gap-2">
            {currentUser && (
              <button
                type="button"
                onClick={handleGoDashboard}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600/20 border border-blue-400/30 text-xs font-bold text-blue-300 hover:bg-blue-600/30 hover:text-white transition cursor-pointer"
              >
                <LayoutDashboard size={13} />
                <span>Dashboard</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleBackHome}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#c5a880]/40 text-xs font-bold text-amber-200/90 hover:bg-[#c5a880]/15 hover:text-white transition cursor-pointer"
            >
              <ArrowLeft size={14} />
              <span>Back to Home</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Luxury Obsidian Card */}
      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 py-8 sm:py-12">
        <div 
          className="relative w-full max-w-[440px] rounded-3xl overflow-hidden text-slate-100"
          style={{
            background: 'linear-gradient(180deg, #0e172a 0%, #060b17 100%)',
            border: '1.5px solid #c5a880',
            boxShadow: '0 25px 60px rgba(0, 0, 0, 0.85), 0 0 30px rgba(197, 168, 128, 0.22)',
          }}
        >
          {/* Top 24k Gold Shimmer Line */}
          <div style={{ height: '3.5px', background: 'linear-gradient(90deg, #876a2e 0%, #dfb24e 50%, #876a2e 100%)' }} />

          {/* Card Header */}
          <div className="pt-6 pb-3 px-5 sm:px-7 text-center">
            {/* Official Gold & Navy Emblem */}
            <div className="inline-flex items-center justify-center w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-[#1e3a63] to-[#0e2038] border border-[#c5a880] shadow-lg shadow-black/60 mb-3 text-[#e5c07b]">
              <CreditCard size={26} />
            </div>

            {/* Brand Title with Verified Badge */}
            <div className="flex items-center justify-center gap-1.5 mb-1.5">
              <span className="text-xs sm:text-sm font-black tracking-widest text-[#f8fafc] uppercase">
                MEHANDA ARMY INVESTMENTS
              </span>
              <BrandVerificationBadge className="h-4 w-4" />
            </div>

            {/* Service Status Pill */}
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 bg-amber-500/15 border border-amber-500/40 rounded-full text-[10px] sm:text-[11px] font-bold text-amber-300 tracking-wider uppercase mb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              <span>SERVICE CURRENTLY UNAVAILABLE</span>
            </div>

            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-1">
              Online Payment Not Active
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 font-medium">
              ऑनलाइन भुगतान सेवा वर्तमान में सक्रिय नहीं है
            </p>
          </div>

          {/* Compact Luxury Body */}
          <div className="px-5 sm:px-7 py-3 space-y-3 text-xs sm:text-[12.5px]">
            
            {/* Notice Box 1: Advisory */}
            <div className="p-3.5 rounded-2xl bg-[#111c33]/85 border border-white/10 space-y-2.5">
              <div className="flex items-start gap-2.5">
                <span className="text-amber-400 font-bold shrink-0 text-sm">✦</span>
                <p className="text-slate-300 leading-relaxed">
                  <strong className="text-white">Notice to Clients:</strong> Mehanda Army Investments website par online payment ya advance processing fees lene ki suvidha abhi uplabdh nahi hai.
                </p>
              </div>
              <div className="flex items-start gap-2.5 pt-2 border-t border-white/5">
                <span className="text-emerald-400 font-bold shrink-0 text-sm">✓</span>
                <p className="text-slate-300 leading-relaxed">
                  Hamari sabhi loan guidance (<strong className="text-white">Student Loan, Dairy, Sheep, Goat Farming</strong>) bina kisi online charges ke 100% transparently provide ki jaati hain.
                </p>
              </div>
              <div className="flex items-start gap-2.5 pt-2 border-t border-white/5">
                <span className="text-blue-400 font-bold shrink-0 text-sm">⚡</span>
                <p className="text-slate-300 leading-relaxed">
                  Aane wale samay me authorized banking gateways ke madhyam se digital payment options ko shuru kiya jayega.
                </p>
              </div>
            </div>

            {/* Anti-Fraud Security Notice */}
            <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/30 text-red-200 text-xs flex items-start gap-2.5 leading-relaxed">
              <Lock size={15} className="text-red-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-red-300 font-bold">Suraksha Chetavani:</strong> Mehanda Army Investments ke naam par kisi ko bhi online advance paise ya private OTP na dein. Hum kabhi aapse paise nahi maangte.
              </div>
            </div>

            {/* Official Support & Location Desk */}
            <div className="p-3 rounded-xl bg-[#08101e] border border-[#c5a880]/30 space-y-1.5 text-xs text-slate-300">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Phone size={12} className="text-emerald-400" /> Helpline:
                </span>
                <a href="tel:+919812947813" className="font-bold text-white hover:text-emerald-400 transition-colors">
                  +91 9812947813
                </a>
              </div>
              <div className="flex items-center justify-between text-[11px] pt-1 border-t border-white/5">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Mail size={12} className="text-blue-400" /> Email:
                </span>
                <a href="mailto:info@mehandaarmy.net" className="font-bold text-white hover:text-blue-400 transition-colors">
                  info@mehandaarmy.net
                </a>
              </div>
              <div className="text-[10.5px] text-amber-200/80 pt-1 text-right border-t border-white/5">
                Hisar, Haryana, India
              </div>
            </div>

          </div>

          {/* Card Footer Actions */}
          <div className="p-5 sm:p-7 pt-2 space-y-2.5">
            <button
              type="button"
              onClick={handleBackHome}
              className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl text-xs sm:text-sm shadow-lg shadow-blue-600/30 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Home size={15} />
              <span>Return to Homepage (मुख्य पृष्ठ पर जाएं)</span>
            </button>

            {currentUser && (
              <button
                type="button"
                onClick={handleGoDashboard}
                className="w-full py-2.5 px-4 bg-[#111c33] hover:bg-[#182746] text-blue-200 hover:text-white font-bold rounded-xl text-xs border border-white/10 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <LayoutDashboard size={14} />
                <span>Go to Customer Dashboard (डैशबोर्ड)</span>
              </button>
            )}

            <a
              href="https://wa.me/919812947813?text=Hello%20Mehanda%20Army%20Investments%2C%20I%20have%20an%20enquiry."
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2 px-4 text-center block text-[11px] text-slate-400 hover:text-emerald-400 transition-colors"
            >
              Contact Official WhatsApp Support →
            </a>
          </div>

        </div>
      </main>

      {/* Subtle Footer */}
      <footer className="text-center py-4 text-[11px] text-slate-500">
        © {new Date().getFullYear()} Mehanda Army Investments • Hisar, Haryana, India
      </footer>

    </div>
  );
}
