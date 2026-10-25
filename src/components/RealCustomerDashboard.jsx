import React from 'react';
import { 
  TrendingUp, 
  LogOut, 
  User, 
  ShieldCheck, 
  Clock, 
  FileText, 
  Phone, 
  Mail, 
  MessageCircle, 
  AlertCircle, 
  ArrowLeft,
  Building2,
  FolderOpen
} from 'lucide-react';
import { authService } from '../lib/supabaseClient';

export default function RealCustomerDashboard({ user, setCurrentView, setAuthenticatedUser }) {
  const handleLogout = async () => {
    await authService.signOut();
    setAuthenticatedUser(null);
    setCurrentView('home');
  };

  const OFFICIAL_PHONE = "+91 9812947813";
  const OFFICIAL_WHATSAPP_URL = "https://wa.me/919812947813?text=Hello%20Mehanda%20Army%20Investments%2C%20I%20have%20logged%20into%20my%20real%20account%20and%20need%20assistance.";

  return (
    <div className="min-h-screen bg-[#081525] text-white font-sans">
      
      {/* Real Customer Top Navbar */}
      <header className="bg-[#10243B] border-b border-white/10 px-4 sm:px-8 py-4 flex flex-wrap justify-between items-center gap-4 sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-tr from-[#FF851B] to-amber-500 rounded-xl flex items-center justify-center shadow-md">
            <TrendingUp size={22} className="text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-extrabold text-base text-white">Client Portfolio Portal</h2>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-[#00C995] border border-emerald-500/30 px-2 py-0.5 rounded">
                REAL ACCOUNT
              </span>
            </div>
            <span className="text-xs text-gray-400">Mehanda Army Investments</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => setCurrentView('home')}
            className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-white/10 hover:bg-white/15 text-gray-200 transition-colors"
          >
            Public Website
          </button>
          
          <button 
            onClick={handleLogout}
            className="px-3.5 py-2 text-xs font-bold rounded-lg bg-red-500/15 hover:bg-red-500/25 text-red-300 border border-red-500/30 transition-colors flex items-center gap-1.5"
          >
            <LogOut size={14} /> Secure Logout
          </button>
        </div>
      </header>

      {/* Main Dashboard Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Real Customer Profile Banner */}
        <div className="bg-[#10243B] p-6 sm:p-8 rounded-3xl border border-white/10 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-500/30 text-blue-300 text-xs font-semibold mb-2">
              <ShieldCheck size={14} className="text-[#00C995]" />
              Authorized Client Profile
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">
              Welcome, {user?.fullName || 'Client Investor'}
            </h1>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400 mt-2">
              <span>Email: <strong className="text-gray-200">{user?.email}</strong></span>
              {user?.phone && <span>Phone: <strong className="text-gray-200">{user?.phone}</strong></span>}
              <span>Account ID: <strong className="text-amber-400 font-mono">{user?.id ? `MAI-${user.id.slice(-6).toUpperCase()}` : 'MAI-REG-7813'}</strong></span>
            </div>
          </div>

          <div className="bg-[#081525] p-4 rounded-2xl border border-white/10 text-right self-stretch md:self-auto">
            <span className="text-[10px] text-gray-400 uppercase tracking-wider block">Account Onboarding Status</span>
            <span className="text-xs font-bold text-amber-400 mt-1 inline-flex items-center gap-1.5">
              <Clock size={13} /> Pending Advisory Verification & KYC
            </span>
          </div>
        </div>

        {/* Real Portfolio Status (Factual & Honest per PART 3) */}
        <div className="bg-[#10243B] p-8 sm:p-12 rounded-3xl border border-white/10 text-center shadow-xl space-y-4">
          <div className="w-16 h-16 bg-[#081525] rounded-2xl border border-white/10 flex items-center justify-center text-gray-400 mx-auto">
            <FolderOpen size={30} className="text-gray-400" />
          </div>

          <h3 className="text-xl font-bold text-white">
            No Portfolio Data Available Yet
          </h3>

          <p className="text-xs sm:text-sm text-gray-300 max-w-xl mx-auto leading-relaxed font-normal">
            Your real client account has been securely registered. In accordance with strict fiduciary standards, live portfolio balances and holdings will only appear here once your risk assessment is completed and your initial capital allocation is cleared with accredited depository institutions.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row justify-center gap-4">
            <a 
              href={OFFICIAL_WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 bg-[#25D366] hover:bg-emerald-600 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all inline-flex items-center justify-center gap-2 shadow-md"
            >
              <MessageCircle size={15} /> Contact Relationship Desk (+91 9812947813)
            </a>

            <button 
              onClick={() => setCurrentView('demo-dashboard')}
              className="px-6 py-3 bg-white/10 hover:bg-white/15 text-gray-200 font-bold rounded-xl text-xs uppercase tracking-wider transition-colors"
            >
              Explore Sample Demo Portfolio
            </button>
          </div>
        </div>

        {/* 3 Steps to Activate Real Portfolio */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-[#10243B] p-6 rounded-2xl border border-white/10">
            <div className="w-10 h-10 rounded-xl bg-[#081525] flex items-center justify-center text-[#FF851B] font-bold text-sm mb-4">
              1
            </div>
            <h4 className="font-bold text-white text-sm mb-1.5">Risk & Objective Assessment</h4>
            <p className="text-xs text-gray-400 leading-relaxed">
              Complete your risk questionnaire with your dedicated advisor to establish target asset allocation parameters.
            </p>
          </div>

          <div className="bg-[#10243B] p-6 rounded-2xl border border-white/10">
            <div className="w-10 h-10 rounded-xl bg-[#081525] flex items-center justify-center text-[#00C995] font-bold text-sm mb-4">
              2
            </div>
            <h4 className="font-bold text-white text-sm mb-1.5">Depository & KYC Linkage</h4>
            <p className="text-xs text-gray-400 leading-relaxed">
              Verify your official PAN, KYC status, and depository participant credentials for institutional custody.
            </p>
          </div>

          <div className="bg-[#10243B] p-6 rounded-2xl border border-white/10">
            <div className="w-10 h-10 rounded-xl bg-[#081525] flex items-center justify-center text-blue-400 font-bold text-sm mb-4">
              3
            </div>
            <h4 className="font-bold text-white text-sm mb-1.5">Regulated Execution & Live Feed</h4>
            <p className="text-xs text-gray-400 leading-relaxed">
              Once deployed, live verified NAVs, transaction receipts, and periodic reports will automatically stream to this dashboard.
            </p>
          </div>
        </div>

        {/* Dedicated Advisory Desk Contact Card */}
        <div className="bg-[#10243B] p-6 rounded-2xl border border-white/10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h4 className="font-bold text-white text-sm">Assigned Client Advisory Desk</h4>
            <p className="text-xs text-gray-400 mt-0.5">Mehanda Army Investments — Senior Relationship Team</p>
          </div>

          <div className="flex flex-wrap gap-4 text-xs font-semibold">
            <a href={`tel:${OFFICIAL_PHONE.replace(/\s+/g, '')}`} className="flex items-center gap-1.5 text-gray-300 hover:text-[#FF851B]">
              <Phone size={14} /> {OFFICIAL_PHONE}
            </a>
            <a href="mailto:Info@mehandaarmy.in" className="flex items-center gap-1.5 text-gray-300 hover:text-[#00C995]">
              <Mail size={14} /> Info@mehandaarmy.in
            </a>
          </div>
        </div>

      </main>
    </div>
  );
}
