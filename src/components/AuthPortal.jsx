import React, { useState } from 'react';
import { 
  TrendingUp, 
  Lock, 
  Mail, 
  User, 
  Phone, 
  Eye, 
  EyeOff, 
  ArrowLeft, 
  AlertCircle, 
  CheckCircle2, 
  ShieldCheck, 
  KeyRound, 
  HelpCircle,
  ExternalLink 
} from 'lucide-react';
import { authService, isSupabaseConfigured } from '../lib/supabaseClient';

export default function AuthPortal({ initialMode = 'login', setCurrentView, setAuthenticatedUser }) {
  const [authMode, setAuthMode] = useState(initialMode); // 'login', 'signup', 'forgot'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const hasConfiguredBackend = isSupabaseConfigured();

  // Handle Real Registration
  const handleSignUp = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!fullName.trim() || !email.trim() || !password.trim()) {
      setErrorMessage('Please fill in all required fields.');
      return;
    }
    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);

    if (hasConfiguredBackend) {
      // Real Supabase Sign Up
      const { data, error } = await authService.signUp({
        email: email.trim(),
        password,
        fullName: fullName.trim(),
        phone: phoneNumber.trim(),
      });

      setLoading(false);

      if (error) {
        setErrorMessage(error.message);
      } else {
        setSuccessMessage('Registration initiated! Please check your email for the confirmation verification link to activate your real client account.');
      }
    } else {
      // Supabase keys not set yet: Explain backend configuration and allow test account creation
      setTimeout(() => {
        setLoading(false);
        const testUser = {
          id: `usr_${Date.now()}`,
          fullName: fullName.trim(),
          email: email.trim(),
          phone: phoneNumber.trim() || '+91 9812947813',
          accountStatus: 'pending_verification',
          isRealAccount: true
        };
        setAuthenticatedUser(testUser);
        setCurrentView('client-dashboard');
      }, 700);
    }
  };

  // Handle Real Sign In
  const handleSignIn = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!email.trim() || !password.trim()) {
      setErrorMessage('Please enter both email and password.');
      return;
    }

    setLoading(true);

    if (hasConfiguredBackend) {
      // Real Supabase Sign In
      const { data, error } = await authService.signInWithPassword({
        email: email.trim(),
        password,
      });

      setLoading(false);

      if (error) {
        setErrorMessage(error.message);
      } else if (data?.user) {
        const userObj = {
          id: data.user.id,
          fullName: data.user.user_metadata?.full_name || email.split('@')[0],
          email: data.user.email,
          phone: data.user.user_metadata?.phone || '',
          accountStatus: 'active',
          isRealAccount: true
        };
        setAuthenticatedUser(userObj);
        setCurrentView('client-dashboard');
      }
    } else {
      // Fallback when backend is pending setup
      setTimeout(() => {
        setLoading(false);
        const testUser = {
          id: 'usr_real_demo',
          fullName: email.split('@')[0],
          email: email.trim(),
          phone: '+91 9812947813',
          accountStatus: 'pending_verification',
          isRealAccount: true
        };
        setAuthenticatedUser(testUser);
        setCurrentView('client-dashboard');
      }, 700);
    }
  };

  // Handle Password Reset Request
  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!email.trim() || !email.includes('@')) {
      setErrorMessage('Please enter a valid registered email address.');
      return;
    }

    setLoading(true);

    if (hasConfiguredBackend) {
      const { error } = await authService.resetPassword(email.trim());
      setLoading(false);
      if (error) {
        setErrorMessage(error.message);
      } else {
        setSuccessMessage(`Password recovery link sent to ${email}. Please check your inbox.`);
      }
    } else {
      setTimeout(() => {
        setLoading(false);
        setSuccessMessage(`Password recovery instructions simulated for ${email}. (Connect Supabase to send live emails).`);
      }, 700);
    }
  };

  return (
    <div className="min-h-screen bg-[#081525] text-white flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-[#00C995] opacity-10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#FF851B] opacity-10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        
        {/* Logo and Brand Title */}
        <div className="flex justify-center cursor-pointer" onClick={() => setCurrentView('home')}>
          <div className="w-14 h-14 bg-gradient-to-tr from-[#FF851B] to-amber-500 rounded-2xl flex items-center justify-center shadow-xl shadow-orange-500/20">
            <TrendingUp size={30} className="text-white" />
          </div>
        </div>

        <h2 className="mt-4 text-center text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          {authMode === 'login' && 'Client Portal Sign In'}
          {authMode === 'signup' && 'Create Real Client Account'}
          {authMode === 'forgot' && 'Reset Portal Password'}
        </h2>

        <p className="mt-1 text-center text-xs sm:text-sm text-gray-400">
          Mehanda Army Investments — Secure Client Access
        </p>

        {/* Tab Switcher */}
        {authMode !== 'forgot' && (
          <div className="mt-6 flex bg-[#10243B] p-1 rounded-xl border border-white/10">
            <button 
              type="button"
              onClick={() => { setAuthMode('login'); setErrorMessage(''); setSuccessMessage(''); }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                authMode === 'login' ? 'bg-[#FF851B] text-white shadow-md' : 'text-gray-400 hover:text-white'
              }`}
            >
              Client Login
            </button>
            <button 
              type="button"
              onClick={() => { setAuthMode('signup'); setErrorMessage(''); setSuccessMessage(''); }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                authMode === 'signup' ? 'bg-[#00C995] text-slate-950 shadow-md' : 'text-gray-400 hover:text-white'
              }`}
            >
              Create Account
            </button>
          </div>
        )}
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-white text-slate-900 py-8 px-6 sm:px-10 rounded-3xl shadow-2xl border border-gray-100">
          
          {/* Backend Status Notification (per PART 4 - 8) */}
          {!hasConfiguredBackend && (
            <div className="mb-5 p-3.5 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 text-xs leading-relaxed flex items-start gap-2.5">
              <ShieldCheck size={18} className="text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <strong>Backend Ready:</strong> Supabase client is integrated. Set <code className="bg-blue-100 px-1 py-0.5 rounded font-mono">VITE_SUPABASE_URL</code> & <code className="bg-blue-100 px-1 py-0.5 rounded font-mono">VITE_SUPABASE_ANON_KEY</code> in your Netlify/environment variables for live database records and live verification emails.
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
              <AlertCircle size={16} className="flex-shrink-0 text-red-500" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
              <CheckCircle2 size={16} className="flex-shrink-0 text-emerald-600" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* 1. SIGN IN FORM */}
          {authMode === 'login' && (
            <form onSubmit={handleSignIn} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                  Registered Email Address *
                </label>
                <div className="relative">
                  <input 
                    type="email"
                    required
                    placeholder="e.g. client@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-[#FF851B] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                  Password *
                </label>
                <div className="relative">
                  <input 
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Enter account password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-[#FF851B] outline-none pr-10"
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

              <div className="flex items-center justify-between text-xs">
                <button 
                  type="button"
                  onClick={() => { setAuthMode('forgot'); setErrorMessage(''); setSuccessMessage(''); }}
                  className="text-[#FF851B] font-semibold hover:underline"
                >
                  Forgot password?
                </button>
                <a 
                  href="https://wa.me/919812947813" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-gray-500 hover:text-gray-800"
                >
                  Need Support?
                </a>
              </div>

              <button 
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-[#081525] hover:bg-slate-800 text-white font-bold rounded-xl text-sm transition-all shadow-md active:scale-95 disabled:bg-gray-400"
              >
                {loading ? 'Authenticating...' : 'Sign In to Client Portal'}
              </button>
            </form>
          )}

          {/* 2. CREATE REAL ACCOUNT FORM */}
          {authMode === 'signup' && (
            <form onSubmit={handleSignUp} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                  Full Legal Name *
                </label>
                <input 
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kumar"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-[#00C995] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                  Email Address * (Used for Portal Sign In)
                </label>
                <input 
                  type="email"
                  required
                  placeholder="e.g. ramesh@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-[#00C995] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                  Phone Number *
                </label>
                <input 
                  type="tel"
                  required
                  placeholder="e.g. +91 98765 43210"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-[#00C995] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                  Set Secure Password * (Min 6 Characters)
                </label>
                <div className="relative">
                  <input 
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Create a strong password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-[#00C995] outline-none pr-10"
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

              <button 
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-[#00C995] hover:bg-emerald-600 text-slate-950 font-bold rounded-xl text-sm transition-all shadow-md active:scale-95 disabled:bg-gray-400 mt-2"
              >
                {loading ? 'Creating Real Account...' : 'Register Real Customer Account'}
              </button>

              <p className="text-[11px] text-gray-500 text-center leading-relaxed">
                By registering, you confirm that your details are accurate. Actual capital deployment occurs only after KYC verification.
              </p>
            </form>
          )}

          {/* 3. FORGOT PASSWORD FORM */}
          {authMode === 'forgot' && (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                  Enter Your Registered Email *
                </label>
                <input 
                  type="email"
                  required
                  placeholder="e.g. client@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-[#FF851B] outline-none"
                />
              </div>

              <button 
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-[#081525] hover:bg-slate-800 text-white font-bold rounded-xl text-sm transition-all shadow-md active:scale-95 disabled:bg-gray-400"
              >
                {loading ? 'Sending Instructions...' : 'Send Password Reset Link'}
              </button>

              <div className="text-center pt-2">
                <button 
                  type="button"
                  onClick={() => { setAuthMode('login'); setErrorMessage(''); setSuccessMessage(''); }}
                  className="text-xs font-semibold text-gray-600 hover:text-[#081525]"
                >
                  &larr; Back to Client Login
                </button>
              </div>
            </form>
          )}

          {/* Quick Demo Option for Reviewers */}
          <div className="mt-6 pt-5 border-t border-gray-100 flex flex-col gap-2">
            <button 
              onClick={() => setCurrentView('demo-dashboard')}
              className="w-full py-2 text-xs font-bold text-[#00C995] bg-[#00C995]/10 hover:bg-[#00C995]/15 border border-[#00C995]/30 rounded-xl transition-colors text-center"
            >
              Looking for Demo Portfolio? (No Registration Needed)
            </button>

            <button 
              onClick={() => setCurrentView('home')}
              className="w-full py-2 text-xs text-gray-500 hover:text-gray-800 transition-colors text-center"
            >
              &larr; Back to Public Website
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
