import React, { useState } from 'react';
import { TrendingUp, MessageCircle, Menu, X, Briefcase, UserPlus, PlayCircle, ShieldCheck } from 'lucide-react';

export default function Navbar({ currentView, setCurrentView, scrollTo }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navLinks = [
    { name: 'Home', href: '#hero' },
    { name: 'About', href: '#about' },
    { name: 'Services', href: '#services' },
    { name: 'Demo Portfolio', href: '#demo-preview' },
    { name: 'Returns Calculator', href: '#calculator' },
    { name: 'Contact', href: '#contact' },
  ];

  const handleNavClick = (e, href) => {
    e.preventDefault();
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
    setIsMobileMenuOpen(false);
  };

  const WHATSAPP_URL = "https://wa.me/919812947813?text=Hello%20Mehanda%20Army%20Investments%2C%20I%20would%20like%20to%20know%20more%20about%20your%20services.";

  return (
    <header className="sticky top-0 bg-[#081525] text-white z-40 shadow-xl border-b border-white/10 backdrop-blur-md bg-opacity-95">
      {/* Top Security & Regulation Notice Bar */}
      <div className="bg-[#10243B] text-gray-300 text-[11px] sm:text-xs py-1.5 px-4 text-center border-b border-white/5 flex items-center justify-center gap-2">
        <ShieldCheck size={14} className="text-[#00C995]" />
        <span>Official Contact: <strong>+91 9812947813</strong> | Capital protection & disciplined long-term investing</span>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo & Brand Identity */}
          <div 
            className="flex-shrink-0 flex items-center cursor-pointer group" 
            onClick={(e) => handleNavClick(e, '#hero')}
          >
            <div className="w-11 h-11 bg-gradient-to-tr from-[#FF851B] to-amber-500 rounded-xl flex items-center justify-center mr-3 shadow-lg shadow-orange-500/20 group-hover:scale-105 transition-transform">
              <TrendingUp size={24} className="text-white" />
            </div>
            <div>
              <span className="font-extrabold text-lg sm:text-xl tracking-tight leading-tight block text-white">
                MEHANDA ARMY
              </span>
              <span className="text-[#00C995] text-[10px] sm:text-xs font-bold uppercase tracking-widest block">
                Investments
              </span>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex space-x-6 items-center">
            {navLinks.map((link) => (
              <a 
                key={link.name} 
                href={link.href} 
                onClick={(e) => handleNavClick(e, link.href)}
                className="text-gray-300 hover:text-[#FF851B] transition-colors text-xs font-semibold uppercase tracking-wider"
              >
                {link.name}
              </a>
            ))}
          </nav>

          {/* Action Buttons */}
          <div className="hidden sm:flex items-center space-x-3">
            <button 
              onClick={() => setCurrentView('demo-dashboard')}
              className="px-3.5 py-2 text-xs font-bold rounded-lg border border-[#00C995]/50 text-[#00C995] hover:bg-[#00C995]/10 transition-all flex items-center gap-1.5"
            >
              <PlayCircle size={14} /> Explore Demo
            </button>
            <button 
              onClick={() => setCurrentView('auth-login')}
              className="px-3.5 py-2 text-xs font-bold rounded-lg text-white bg-white/10 hover:bg-white/20 transition-all flex items-center gap-1.5"
            >
              <Briefcase size={14} /> Client Login
            </button>
            <button 
              onClick={() => setCurrentView('auth-signup')}
              className="px-4 py-2 text-xs font-bold rounded-lg text-white bg-[#FF851B] hover:bg-orange-600 transition-all shadow-md shadow-orange-500/25 flex items-center gap-1.5"
            >
              <UserPlus size={14} /> Create Account
            </button>
          </div>

          {/* Mobile menu hamburger button */}
          <div className="lg:hidden flex items-center gap-2">
            <button 
              onClick={() => setCurrentView('demo-dashboard')}
              className="sm:hidden px-2.5 py-1.5 text-[11px] font-bold rounded-md border border-[#00C995]/50 text-[#00C995]"
            >
              Demo
            </button>
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-gray-300 hover:text-white p-2 rounded-lg bg-white/5 border border-white/10 focus:outline-none"
              aria-label="Toggle Navigation Menu"
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {isMobileMenuOpen && (
        <div className="lg:hidden bg-[#081525] border-t border-white/10 px-5 pt-4 pb-6 space-y-3 shadow-2xl animate-fadeIn">
          {navLinks.map((link) => (
            <a
              key={link.name}
              href={link.href}
              onClick={(e) => handleNavClick(e, link.href)}
              className="block px-3 py-2.5 text-sm font-semibold text-gray-200 hover:text-[#FF851B] hover:bg-white/5 rounded-lg transition-colors"
            >
              {link.name}
            </a>
          ))}
          <div className="pt-3 border-t border-white/10 flex flex-col gap-2.5">
            <button 
              onClick={() => { setCurrentView('demo-dashboard'); setIsMobileMenuOpen(false); }}
              className="w-full py-2.5 text-xs font-bold rounded-lg border border-[#00C995] text-[#00C995] hover:bg-[#00C995]/10 flex items-center justify-center gap-2"
            >
              <PlayCircle size={15} /> Explore Demo Portfolio (No Sign Up)
            </button>
            <button 
              onClick={() => { setCurrentView('auth-login'); setIsMobileMenuOpen(false); }}
              className="w-full py-2.5 text-xs font-bold rounded-lg text-white bg-white/10 hover:bg-white/20 flex items-center justify-center gap-2"
            >
              <Briefcase size={15} /> Real Client Login
            </button>
            <button 
              onClick={() => { setCurrentView('auth-signup'); setIsMobileMenuOpen(false); }}
              className="w-full py-2.5 text-xs font-bold rounded-lg text-white bg-[#FF851B] hover:bg-orange-600 flex items-center justify-center gap-2 shadow-md"
            >
              <UserPlus size={15} /> Create Real Account
            </button>
            <a 
              href={WHATSAPP_URL} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="w-full py-2 text-xs font-bold text-center text-white bg-[#25D366] hover:bg-emerald-600 rounded-lg flex items-center justify-center gap-2"
            >
              <MessageCircle size={15} /> Chat on WhatsApp (+91 9812947813)
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
