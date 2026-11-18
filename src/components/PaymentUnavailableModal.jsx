import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { 
  CreditCard, 
  X, 
  ShieldCheck, 
  Phone, 
  Lock,
  Sparkles
} from 'lucide-react';
import BrandVerificationBadge from './BrandVerificationBadge';

export default function PaymentUnavailableModal({ isOpen, onClose }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div 
      className="fixed inset-0 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm"
      style={{ zIndex: 999999 }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="payment-modal-title"
    >
      {/* Backdrop Click */}
      <div 
        className="absolute inset-0 -z-10 cursor-pointer" 
        onClick={onClose} 
        aria-hidden="true" 
      />

      {/* Main Luxury Compact Card */}
      <div 
        className="relative w-full max-w-[390px] rounded-2xl overflow-hidden text-slate-100"
        style={{
          background: 'linear-gradient(180deg, #0e172a 0%, #060b17 100%)',
          border: '1.5px solid #c5a880',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.85), 0 0 25px rgba(197, 168, 128, 0.2)',
        }}
      >
        {/* Top 24k Gold Shimmer Line */}
        <div style={{ height: '3px', background: 'linear-gradient(90deg, #876a2e 0%, #dfb24e 50%, #876a2e 100%)' }} />

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 p-1.5 text-slate-400 hover:text-white rounded-full hover:bg-white/10 transition-colors cursor-pointer z-10"
          aria-label="Close dialog"
        >
          <X size={16} />
        </button>

        {/* Header */}
        <div className="pt-5 pb-3 px-5 text-center">
          {/* Official Emblem */}
          <div className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-br from-[#1e3a63] to-[#0e2038] border border-[#c5a880] shadow-md shadow-black/50 mb-2.5 text-[#e5c07b]">
            <CreditCard size={22} />
          </div>

          {/* Brand verified header */}
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <span className="text-[11px] font-black tracking-widest text-[#f8fafc] uppercase">
              MEHANDA ARMY INVESTMENTS
            </span>
            <BrandVerificationBadge className="h-3.5 w-3.5" />
          </div>

          {/* Inactive Status Badge */}
          <div className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-amber-500/15 border border-amber-500/40 rounded-full text-[10px] font-bold text-amber-300 tracking-wider uppercase mb-1.5">
            <span>● SERVICE CURRENTLY UNAVAILABLE</span>
          </div>

          <h2 id="payment-modal-title" className="text-lg font-black text-white tracking-tight mt-0.5">
            Online Payment Not Active
          </h2>
          <p className="text-[11px] text-slate-300 mt-0.5 font-medium">
            ऑनलाइन भुगतान सेवा वर्तमान में उपलब्ध नहीं है
          </p>
        </div>

        {/* Compact Body */}
        <div className="px-5 py-2 space-y-2.5 text-xs">
          
          {/* Clean Glassmorphism Notice Box */}
          <div className="p-3 rounded-xl bg-[#111c33]/80 border border-white/10 space-y-2">
            <div className="flex items-start gap-2">
              <span className="text-amber-400 font-bold shrink-0">✦</span>
              <p className="text-slate-300 text-[11.5px] leading-relaxed">
                Website par abhi kisi bhi prakaar ka <strong className="text-white">online payment ya advance fee</strong> lena shuru nahi kiya gaya hai.
              </p>
            </div>
            <div className="flex items-start gap-2 pt-1 border-t border-white/5">
              <span className="text-emerald-400 font-bold shrink-0">✓</span>
              <p className="text-slate-300 text-[11.5px] leading-relaxed">
                Hamari sabhi services (Student Loan, Agri-Dairy Farming Loans) <strong className="text-white">100% free guidance</strong> ke sath uplabdh hain.
              </p>
            </div>
            <div className="flex items-start gap-2 pt-1 border-t border-white/5">
              <span className="text-blue-400 font-bold shrink-0">⚡</span>
              <p className="text-slate-300 text-[11.5px] leading-relaxed">
                Authorized banking gateway integration aane wale samay me shuru kiya jayega.
              </p>
            </div>
          </div>

          {/* Compact Anti-Fraud Security Alert */}
          <div className="px-3 py-2 rounded-lg bg-red-950/40 border border-red-500/30 text-red-200 text-[11px] flex items-center gap-2">
            <Lock size={13} className="text-red-400 shrink-0" />
            <span>
              <strong>Chetavani:</strong> Kisi ko bhi online advance paise ya OTP na dein.
            </span>
          </div>

          {/* Minimal Helpline Line */}
          <div className="pt-1 text-center text-[11px] text-slate-400">
            Helpline: <strong className="text-white">+91 9812947813</strong> • Hisar, Haryana
          </div>

        </div>

        {/* Footer Action Button */}
        <div className="p-4 pt-3 text-center">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl text-xs shadow-md shadow-blue-600/30 active:scale-[0.98] transition-all cursor-pointer"
          >
            Got it / Samajh Gaya (ठीक है)
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
}
