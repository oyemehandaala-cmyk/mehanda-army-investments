import React, { useState, useEffect } from 'react';
import { MessageCircle, ArrowUp } from 'lucide-react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import About from './components/About';
import Services from './components/Services';
import DemoPortfolioPreview from './components/DemoPortfolioPreview';
import HowItWorks from './components/HowItWorks';
import Calculator from './components/Calculator';
import TransparencyRisk from './components/TransparencyRisk';
import Contact from './components/Contact';
import Footer from './components/Footer';
import LegalModal from './components/LegalModal';
import DemoDashboard from './components/DemoDashboard';
import AuthPortal from './components/AuthPortal';
import RealCustomerDashboard from './components/RealCustomerDashboard';
import { authService, isSupabaseConfigured } from './lib/supabaseClient';

export default function App() {
  const [currentView, setCurrentView] = useState('home'); // 'home', 'demo-dashboard', 'auth-login', 'auth-signup', 'client-dashboard'
  const [authenticatedUser, setAuthenticatedUser] = useState(null);
  const [legalModal, setLegalModal] = useState({ isOpen: false, title: '' });
  const [showTopBtn, setShowTopBtn] = useState(false);

  // Scroll to top on view changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentView]);

  // Check for active Supabase session on initial load
  useEffect(() => {
    if (isSupabaseConfigured()) {
      authService.getSession().then(({ session }) => {
        if (session?.user) {
          setAuthenticatedUser({
            id: session.user.id,
            fullName: session.user.user_metadata?.full_name || session.user.email.split('@')[0],
            email: session.user.email,
            phone: session.user.user_metadata?.phone || '',
            accountStatus: 'active',
            isRealAccount: true
          });
        }
      });
    }
  }, []);

  // Floating Back to Top Button handler
  useEffect(() => {
    const handleScroll = () => {
      setShowTopBtn(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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

  const closeLegalModal = () => {
    setLegalModal({ isOpen: false, title: '' });
  };

  const OFFICIAL_WHATSAPP_URL = "https://wa.me/919812947813?text=Hello%20Mehanda%20Army%20Investments%2C%20I%20would%20like%20to%20know%20more%20about%20your%20services.";

  // View Routing: Demo Dashboard (Zero Signup)
  if (currentView === 'demo-dashboard') {
    return <DemoDashboard setCurrentView={setCurrentView} />;
  }

  // View Routing: Real Client Login
  if (currentView === 'auth-login') {
    return (
      <AuthPortal 
        initialMode="login" 
        setCurrentView={setCurrentView} 
        setAuthenticatedUser={setAuthenticatedUser} 
      />
    );
  }

  // View Routing: Real Client Sign Up
  if (currentView === 'auth-signup') {
    return (
      <AuthPortal 
        initialMode="signup" 
        setCurrentView={setCurrentView} 
        setAuthenticatedUser={setAuthenticatedUser} 
      />
    );
  }

  // View Routing: Authenticated Real Customer Dashboard
  if (currentView === 'client-dashboard' && authenticatedUser) {
    return (
      <RealCustomerDashboard 
        user={authenticatedUser} 
        setCurrentView={setCurrentView} 
        setAuthenticatedUser={setAuthenticatedUser} 
      />
    );
  }

  // Default: Homepage View
  return (
    <div className="font-sans text-slate-900 bg-white min-h-screen selection:bg-[#FF851B] selection:text-white">
      
      {/* Navigation */}
      <Navbar 
        currentView={currentView} 
        setCurrentView={setCurrentView} 
        scrollTo={scrollTo} 
      />

      {/* Main Page Flow */}
      <main>
        <Hero 
          setCurrentView={setCurrentView} 
          scrollTo={scrollTo} 
        />
        
        <About />
        
        <Services 
          scrollTo={scrollTo} 
          setCurrentView={setCurrentView} 
        />
        
        <DemoPortfolioPreview 
          setCurrentView={setCurrentView} 
        />
        
        <HowItWorks />
        
        <Calculator 
          scrollTo={scrollTo} 
        />
        
        <TransparencyRisk 
          openLegalModal={openLegalModal} 
        />
        
        <Contact />
      </main>

      {/* Footer */}
      <Footer 
        scrollTo={scrollTo} 
        openLegalModal={openLegalModal} 
      />

      {/* Floating Action Buttons (Clean & Non-Intrusive) */}
      <div className="fixed bottom-5 right-5 flex flex-col items-end gap-2.5 z-40">
        {showTopBtn && (
          <button 
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="w-11 h-11 bg-[#081525] text-white rounded-full flex items-center justify-center shadow-xl hover:bg-slate-800 border border-white/20 transition-all hover:scale-105 active:scale-95"
            aria-label="Scroll to top"
          >
            <ArrowUp size={20} />
          </button>
        )}
        
        <a 
          href={OFFICIAL_WHATSAPP_URL}
          target="_blank" 
          rel="noopener noreferrer"
          className="group flex items-center gap-2 bg-[#25D366] text-white py-2.5 px-3.5 sm:px-4 rounded-full shadow-2xl hover:bg-emerald-600 transition-all hover:scale-105 active:scale-95"
          aria-label="Contact on WhatsApp"
        >
          <MessageCircle size={22} />
          <span className="font-bold text-xs hidden sm:inline-block pr-1">Chat on WhatsApp</span>
        </a>
      </div>

      {/* Regulatory & Legal Modal */}
      <LegalModal 
        isOpen={legalModal.isOpen} 
        title={legalModal.title} 
        onClose={closeLegalModal} 
      />

    </div>
  );
}
