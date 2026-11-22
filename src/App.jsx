import React, { useState, useEffect, useRef, useCallback } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import About from './components/About';
import Services from './components/Services';
import HowItWorks from './components/HowItWorks';
import Calculator from './components/Calculator';
import TransparencyRisk from './components/TransparencyRisk';
import Contact from './components/Contact';
import Footer from './components/Footer';
import LegalModal from './components/LegalModal';
import PrivacyPolicy from './components/PrivacyPolicy';
import TermsAndConditions from './components/TermsAndConditions';
import DemoDashboard from './components/DemoDashboard';
import AuthPortal from './components/AuthPortal';
import SimpleCustomerDashboard from './components/SimpleCustomerDashboard';
import PaymentCentre from './components/PaymentCentre';
import AdminPortal from './components/AdminPortal';
import AICustomerSupport from './components/AICustomerSupport';
import GoogleSignInWelcomePopup from './components/GoogleSignInWelcomePopup';
import LoginRequiredScreen from './components/LoginRequiredScreen';
import { authService, isSupabaseConfigured, toAuthenticatedUser } from './lib/supabaseClient';
import {
  getHrefForView,
  getViewFromLocation,
  requiresCustomerSession
} from './lib/navigation';

const GOOGLE_OAUTH_ERROR_SESSION_KEY = 'mai_google_oauth_error_seen';

function getGoogleOAuthReturnError() {
  try {
    if (window.sessionStorage.getItem(GOOGLE_OAUTH_ERROR_SESSION_KEY) === 'true') return '';
  } catch {
    // Continue with the in-memory callback error handling when storage is unavailable.
  }

  const callbackParams = new URLSearchParams(
    `${window.location.search}&${window.location.hash.replace(/^#/, '')}`
  );
  const error = callbackParams.get('error');
  if (!error) return '';
  if (error === 'access_denied') {
    return 'Google sign-in was cancelled or declined. You can try again.';
  }
  return 'Google sign-in could not be completed. Please try again.';
}

export default function App() {
  const [currentView, setCurrentViewState] = useState(() => getViewFromLocation(window.location));
  const currentViewRef = useRef(currentView);
  const setCurrentView = useCallback((nextView, { replace = false } = {}) => {
    const resolvedView = typeof nextView === 'function'
      ? nextView(currentViewRef.current)
      : nextView;
    if (resolvedView === currentViewRef.current) return;

    currentViewRef.current = resolvedView;
    setCurrentViewState(resolvedView);

    const nextHref = getHrefForView(resolvedView, window.location.href);
    if (nextHref === `${window.location.pathname}${window.location.search}${window.location.hash}`) return;
    const previousState = window.history.state;
    const historyState = previousState && typeof previousState === 'object' ? previousState : {};
    const nextState = { ...historyState, maiView: resolvedView };
    if (replace) {
      window.history.replaceState(nextState, '', nextHref);
    } else {
      window.history.pushState(nextState, '', nextHref);
    }
  }, []);
  const [authenticatedUser, setAuthenticatedUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [legalModal, setLegalModal] = useState({ isOpen: false, title: '' });
  const [isMobileNavigationOpen, setIsMobileNavigationOpen] = useState(false);
  const [googleOAuthReturnError] = useState(getGoogleOAuthReturnError);
  const [isGoogleWelcomeOpen, setIsGoogleWelcomeOpen] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (authenticatedUser) {
      setIsGoogleWelcomeOpen(false);
      return;
    }
    if (currentView.startsWith('admin-') || currentView.startsWith('auth-') || currentView === 'privacy-policy' || currentView === 'terms-and-conditions') {
      setIsGoogleWelcomeOpen(false);
      return;
    }
    if (googleOAuthReturnError) {
      setIsGoogleWelcomeOpen(true);
      return;
    }
    // Do not force automatic login popup on website visit.
    setIsGoogleWelcomeOpen(false);
  }, [authLoading, authenticatedUser, currentView, googleOAuthReturnError]);

  const closeGoogleWelcome = () => {
    setIsGoogleWelcomeOpen(false);
    try {
      window.sessionStorage.setItem('mai_login_popup_dismissed', 'true');
    } catch {
      // ignore
    }
  };

  // Scroll to top on view changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentView]);

  useEffect(() => {
    const syncViewFromLocation = () => {
      const nextView = getViewFromLocation(window.location);
      currentViewRef.current = nextView;
      setCurrentViewState(nextView);
    };
    window.addEventListener('popstate', syncViewFromLocation);
    return () => window.removeEventListener('popstate', syncViewFromLocation);
  }, []);

  // Standalone App Mode: When opened as an installed mobile app and not logged in,
  // require login first before accessing features
  useEffect(() => {
    if (authLoading) return;
    const isStandalone = typeof window !== 'undefined' && (
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true ||
      document.referrer.includes('android-app://')
    );
    if (isStandalone && !authenticatedUser && currentView === 'home') {
      setCurrentView('auth-login');
    }
  }, [authLoading, authenticatedUser, currentView, setCurrentView]);

  // A cached token is not treated as proof of identity; Supabase validates it.
  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setAuthLoading(false);
      return undefined;
    }

    let alive = true;
    let validationId = 0;
    const validateSession = async (event, session) => {
      const currentValidation = ++validationId;
      if (event === 'SIGNED_OUT' || (event === 'INITIAL_SESSION' && !session)) {
        setAuthenticatedUser(null);
        setAuthLoading(false);
        if (event === 'SIGNED_OUT') {
          setCurrentView((view) => (requiresCustomerSession(view) ? 'home' : view));
        }
        return;
      }

      if (event === 'PASSWORD_RECOVERY') {
        setCurrentView((view) => view.startsWith('admin-') ? view : 'auth-reset-password');
      }
      if (!session && event !== 'PASSWORD_RECOVERY') {
        setAuthLoading(false);
        return;
      }

      const { user, error } = await authService.getCurrentUser();
      if (!alive || currentValidation !== validationId) return;
      const isOauthUser = Boolean(
        user?.app_metadata?.provider && user.app_metadata.provider !== 'email'
      ) || (Array.isArray(user?.identities) && user.identities.some(i => i.provider && i.provider !== 'email'));

      const isConfirmed = Boolean(user?.email_confirmed_at || user?.phone_confirmed_at || user?.confirmed_at || isOauthUser);
      if (error || !isConfirmed) {
        setAuthenticatedUser(null);
        setAuthLoading(false);
        await authService.signOut();
        return;
      }

      setAuthenticatedUser(toAuthenticatedUser(user));
      setAuthLoading(false);
      setCurrentView((view) => {
        if (view.startsWith('admin-')) return view;
        if (event === 'PASSWORD_RECOVERY' || view === 'auth-reset-password') return 'auth-reset-password';
        let storedTarget = null;
        try {
          storedTarget = window.sessionStorage.getItem('mai_auth_redirect_target');
          if (storedTarget) window.sessionStorage.removeItem('mai_auth_redirect_target');
        } catch {
          // ignore
        }
        if (storedTarget && ['payments', 'student-loan', 'investment-info', 'loans', 'loan-categories'].includes(storedTarget)) {
          return storedTarget;
        }
        if (['payments', 'student-loan', 'investment-info', 'loans', 'loan-categories'].includes(view)) {
          return view;
        }
        return 'client-dashboard';
      });
    };

    const subscription = authService.onAuthStateChange((event, session) => {
      window.setTimeout(() => validateSession(event, session), 0);
    });
    return () => {
      alive = false;
      subscription.unsubscribe();
    };
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

  // /whatsapp → instant redirect to WhatsApp Business chat box
  // Number: +1 (711) 342-2899  → WhatsApp Business second number for Mehanda Army Investments
  const WHATSAPP_BUSINESS_URL = "https://wa.me/17113422899?text=Hello%20Mehanda%20Army%20Investments%2C%20I%20would%20like%20to%20know%20more%20about%20your%20services.";
  if (currentView === 'whatsapp-redirect') {
    // Immediately redirect to WhatsApp — no blank screen, no spinner
    if (typeof window !== 'undefined') {
      window.location.replace(WHATSAPP_BUSINESS_URL);
    }
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f0fdf4', padding: '2rem', fontFamily: 'sans-serif' }}>
        <div style={{ background: '#25D366', borderRadius: '50%', width: 72, height: 72, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem', boxShadow: '0 4px 24px rgba(37,211,102,0.4)' }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
        </div>
        <h2 style={{ color: '#166534', fontSize: '1.4rem', fontWeight: 700, marginBottom: '.5rem', textAlign: 'center' }}>Mehanda Army Investments</h2>
        <p style={{ color: '#15803d', fontSize: '1rem', marginBottom: '1.5rem', textAlign: 'center' }}>WhatsApp par redirect ho raha hai…</p>
        <a href={WHATSAPP_BUSINESS_URL} style={{ background: '#25D366', color: 'white', borderRadius: 12, padding: '0.75rem 2rem', fontWeight: 700, fontSize: '1rem', textDecoration: 'none', boxShadow: '0 2px 12px rgba(37,211,102,0.5)' }}>
          💬 Open WhatsApp Chat
        </a>
        <p style={{ color: '#6b7280', fontSize: '0.8rem', marginTop: '1rem', textAlign: 'center' }}>Automatically redirecting… click above if not redirected.</p>
      </div>
    );
  }

  // /apk or /app → direct instant download of Mehanda Army APK
  if (currentView === 'apk-download') {
    if (typeof window !== 'undefined') {
      window.location.replace('/MehandaArmy.apk');
    }
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#081525', color: '#fff', padding: '2rem', fontFamily: 'sans-serif', textAlign: 'center' }}>
        <div style={{ background: '#E5B652', borderRadius: '50%', width: 72, height: 72, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem', boxShadow: '0 4px 24px rgba(229,182,82,0.4)', color: '#081525', fontSize: '2rem' }}>
          📱
        </div>
        <h2 style={{ color: '#E5B652', fontSize: '1.5rem', fontWeight: 800, marginBottom: '.5rem' }}>Mehanda Army Investments</h2>
        <p style={{ color: '#cbd5e1', fontSize: '1rem', marginBottom: '1.5rem' }}>Official Android APK download ho raha hai…</p>
        <a href="/MehandaArmy.apk" download="MehandaArmy.apk" style={{ background: '#E5B652', color: '#081525', borderRadius: 12, padding: '0.8rem 2.2rem', fontWeight: 800, fontSize: '1rem', textDecoration: 'none', boxShadow: '0 2px 14px rgba(229,182,82,0.5)' }}>
          ⬇️ Download APK (1.1 MB)
        </a>
        <p style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '1.2rem' }}>Agar download apne aap shuru na ho, toh upar diye button par click karein.</p>
        <a href="/" style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: '1.5rem', textDecoration: 'underline' }}>← Back to Website</a>
      </div>
    );
  }
  const pageWithAssistant = (page) => (
    <>
      {page}
      {!currentView.startsWith('auth-') && !requiresCustomerSession(currentView) && (
        <AICustomerSupport
          setCurrentView={setCurrentView}
          scrollTo={scrollTo}
          whatsappUrl={OFFICIAL_WHATSAPP_URL}
        />
      )}
      {isGoogleWelcomeOpen &&
        !currentView.startsWith('auth-') &&
        !currentView.startsWith('admin-') &&
        !requiresCustomerSession(currentView) && (
        <GoogleSignInWelcomePopup
          onClose={closeGoogleWelcome}
          initialErrorMessage={googleOAuthReturnError}
          setCurrentView={setCurrentView}
          setAuthenticatedUser={setAuthenticatedUser}
        />
      )}
    </>
  );

  if (requiresCustomerSession(currentView) && authLoading) {
    return <div className="min-h-screen bg-white" role="status" aria-label="Checking secure session" />;
  }

  if (requiresCustomerSession(currentView) && !authenticatedUser) {
    return pageWithAssistant(
      <LoginRequiredScreen
        targetViewTitle={currentView === 'student-loan'
          ? 'Student Loan Enquiry'
          : (currentView === 'loans' || currentView === 'loan-categories')
            ? 'Loan Facilitation Desk'
            : currentView === 'investment-info'
              ? 'Investment Information'
              : currentView === 'payments'
                ? 'Payment Centre'
                : 'customer services'}
        targetView={currentView}
        setCurrentView={setCurrentView}
        setAuthenticatedUser={setAuthenticatedUser}
      />
    );
  }

  // View Routing: Professional Payment Centre
  if (currentView === 'payments') {
    return pageWithAssistant(
      <PaymentCentre
        setCurrentView={setCurrentView}
        currentUser={authenticatedUser}
      />
    );
  }

  // View Routing: Public Privacy Policy (Zero Login Required)
  if (currentView === 'privacy-policy') {
    return pageWithAssistant(
      <PrivacyPolicy
        setCurrentView={setCurrentView}
        scrollTo={scrollTo}
        openLegalModal={openLegalModal}
      />
    );
  }

  // View Routing: Public Terms & Conditions (Zero Login Required)
  if (currentView === 'terms-and-conditions') {
    return pageWithAssistant(
      <TermsAndConditions
        setCurrentView={setCurrentView}
        scrollTo={scrollTo}
        openLegalModal={openLegalModal}
      />
    );
  }

  // Admin routes are separate from customer login and the customer support widget.
  if (currentView === 'admin-login' || currentView === 'admin-dashboard') {
    return <AdminPortal setCurrentView={setCurrentView} />;
  }

  // View Routing: Demo Dashboard (Zero Signup)
  if (currentView === 'demo-dashboard') {
    return pageWithAssistant(<DemoDashboard setCurrentView={setCurrentView} />);
  }

  // View Routing: Real Client Login
  if (currentView === 'auth-login') {
    return pageWithAssistant(
      <AuthPortal 
        initialMode="login" 
        setCurrentView={setCurrentView} 
        setAuthenticatedUser={setAuthenticatedUser} 
      />
    );
  }

  // View Routing: Real Client Sign Up
  if (currentView === 'auth-signup') {
    return pageWithAssistant(
      <AuthPortal 
        initialMode="signup" 
        setCurrentView={setCurrentView} 
        setAuthenticatedUser={setAuthenticatedUser} 
      />
    );
  }

  if (currentView === 'auth-reset-password') {
    return pageWithAssistant(
      <AuthPortal
        initialMode="reset-password"
        setCurrentView={setCurrentView}
        setAuthenticatedUser={setAuthenticatedUser}
      />
    );
  }

  if (currentView === 'auth-recovery-key' || currentView === 'auth-rotate-recovery-key') {
    if (authenticatedUser) {
      return pageWithAssistant(
        <SimpleCustomerDashboard
          user={authenticatedUser}
          initialView="home"
          setCurrentView={setCurrentView}
          setAuthenticatedUser={setAuthenticatedUser}
        />
      );
    }
    return pageWithAssistant(
      <AuthPortal
        initialMode="login"
        setCurrentView={setCurrentView}
        setAuthenticatedUser={setAuthenticatedUser}
      />
    );
  }

  // View Routing: Authenticated Real Customer Dashboard
  if (
    authenticatedUser &&
    ['client-dashboard', 'loans', 'loan-categories', 'student-loan', 'investment-info'].includes(currentView)
  ) {
    return pageWithAssistant(
      <SimpleCustomerDashboard
        user={authenticatedUser} 
        initialView={currentView === 'student-loan'
          ? 'student-loan'
          : (currentView === 'loans' || currentView === 'loan-categories')
            ? 'loan-categories'
            : currentView === 'investment-info'
              ? 'investment-info'
              : 'home'}
        setCurrentView={setCurrentView} 
        setAuthenticatedUser={setAuthenticatedUser} 
      />
    );
  }

  // Default: Homepage View
  return (
    <div className="font-sans text-slate-900 bg-white min-h-screen selection:bg-[#876A2E] selection:text-white">
      
      {/* Navigation */}
      <Navbar 
        currentView={currentView} 
        setCurrentView={setCurrentView} 
        scrollTo={scrollTo} 
        onMobileMenuChange={setIsMobileNavigationOpen}
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
        
        <HowItWorks />
        
        <Calculator 
          scrollTo={scrollTo} 
        />
        
        <TransparencyRisk 
          openLegalModal={openLegalModal} 
          setCurrentView={setCurrentView}
        />
        
        <Contact />
      </main>

      {/* Footer */}
      <Footer 
        scrollTo={scrollTo} 
        openLegalModal={openLegalModal} 
        setCurrentView={setCurrentView}
      />

      <AICustomerSupport
        setCurrentView={setCurrentView}
        scrollTo={scrollTo}
        whatsappUrl={OFFICIAL_WHATSAPP_URL}
        isHidden={isMobileNavigationOpen}
      />
      {isGoogleWelcomeOpen && (
        <GoogleSignInWelcomePopup
          onClose={closeGoogleWelcome}
          initialErrorMessage={googleOAuthReturnError}
          setCurrentView={setCurrentView}
          setAuthenticatedUser={setAuthenticatedUser}
        />
      )}

      {/* Regulatory & Legal Modal */}
      <LegalModal 
        isOpen={legalModal.isOpen} 
        title={legalModal.title} 
        onClose={closeLegalModal} 
      />

    </div>
  );
}
