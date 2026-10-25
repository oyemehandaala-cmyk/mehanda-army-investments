import React from 'react';
import { TrendingUp, Phone, Mail, MessageCircle, ShieldCheck } from 'lucide-react';

export default function Footer({ scrollTo, openLegalModal }) {
  const OFFICIAL_PHONE = "+91 9812947813";
  const OFFICIAL_WHATSAPP_URL = "https://wa.me/919812947813?text=Hello%20Mehanda%20Army%20Investments%2C%20I%20would%20like%20to%20know%20more%20about%20your%20services.";
  const OFFICIAL_EMAIL = "Info@mehandaarmy.in";

  return (
    <footer className="bg-[#081525] text-gray-300 pt-16 pb-8 border-t border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Main Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          
          {/* Brand Info */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-gradient-to-tr from-[#FF851B] to-amber-500 rounded-xl flex items-center justify-center mr-3 shadow-md">
                <TrendingUp size={22} className="text-white" />
              </div>
              <div>
                <span className="font-extrabold text-lg text-white block">MEHANDA ARMY INVESTMENTS</span>
                <span className="text-[#00C995] text-[10px] font-bold uppercase tracking-wider block">Disciplined Wealth Management</span>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-gray-400 max-w-md mb-6 leading-relaxed font-normal">
              Structured multi-asset portfolio planning and capital preservation tailored for working professionals, defense veterans, and families across India.
            </p>

            <div className="text-xs text-gray-400 border border-white/10 p-3.5 rounded-xl bg-white/5 leading-relaxed">
              <strong className="text-white font-semibold">Statutory Risk Disclosure:</strong> Securities markets, mutual funds, and market-linked products are subject to market risks. Read all scheme related documents carefully before investing. Past performance does not guarantee future results.
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-bold mb-4 uppercase text-xs tracking-widest text-[#FF851B]">
              Navigation
            </h4>
            <ul className="space-y-2.5 text-xs sm:text-sm">
              <li><a href="#about" onClick={(e) => { e.preventDefault(); scrollTo('#about'); }} className="hover:text-white transition-colors">About Us</a></li>
              <li><a href="#services" onClick={(e) => { e.preventDefault(); scrollTo('#services'); }} className="hover:text-white transition-colors">Strategic Services</a></li>
              <li><a href="#demo-preview" onClick={(e) => { e.preventDefault(); scrollTo('#demo-preview'); }} className="hover:text-white transition-colors">Demo Portfolio</a></li>
              <li><a href="#calculator" onClick={(e) => { e.preventDefault(); scrollTo('#calculator'); }} className="hover:text-white transition-colors">Returns Calculator</a></li>
              <li><a href="#contact" onClick={(e) => { e.preventDefault(); scrollTo('#contact'); }} className="hover:text-white transition-colors">Contact Advisor</a></li>
            </ul>
          </div>

          {/* Legal & Policies */}
          <div>
            <h4 className="text-white font-bold mb-4 uppercase text-xs tracking-widest text-[#00C995]">
              Legal & Disclosures
            </h4>
            <ul className="space-y-2.5 text-xs sm:text-sm">
              <li>
                <button onClick={() => openLegalModal('Privacy Policy')} className="hover:text-white transition-colors text-left">
                  Privacy Policy
                </button>
              </li>
              <li>
                <button onClick={() => openLegalModal('Terms & Conditions')} className="hover:text-white transition-colors text-left">
                  Terms & Conditions
                </button>
              </li>
              <li>
                <button onClick={() => openLegalModal('Risk Disclosure')} className="hover:text-white transition-colors text-left">
                  Risk & Limitations Disclosure
                </button>
              </li>
              <li>
                <button onClick={() => openLegalModal('Grievance Officer')} className="hover:text-white transition-colors text-left">
                  Grievance Redressal
                </button>
              </li>
            </ul>
          </div>

        </div>

        {/* Verified Contact Bar */}
        <div className="border-t border-white/10 pt-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-8 justify-center items-center text-xs sm:text-sm text-gray-300">
            <a href={`tel:${OFFICIAL_PHONE.replace(/\s+/g, '')}`} className="flex items-center gap-2 hover:text-[#FF851B] transition-colors">
              <Phone size={15} /> {OFFICIAL_PHONE}
            </a>
            <a href={`mailto:${OFFICIAL_EMAIL}`} className="flex items-center gap-2 hover:text-[#00C995] transition-colors">
              <Mail size={15} /> {OFFICIAL_EMAIL}
            </a>
            <a href={OFFICIAL_WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-[#25D366] hover:text-emerald-400 transition-colors">
              <MessageCircle size={15} /> WhatsApp Support Desk
            </a>
          </div>
        </div>

        {/* Bottom Copyright */}
        <div className="border-t border-white/5 pt-6 flex flex-col sm:flex-row justify-between items-center gap-3 text-[11px] text-gray-500">
          <p>&copy; {new Date().getFullYear()} MEHANDA ARMY INVESTMENTS. All rights reserved.</p>
          <p className="flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-[#00C995]" />
            Disciplined Wealth Management & Client Fiduciary Focus
          </p>
        </div>

      </div>
    </footer>
  );
}
