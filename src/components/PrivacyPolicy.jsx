import React from 'react';
import { ShieldCheck, Lock, EyeOff, FileText, ArrowLeft, Phone, Mail, MessageCircle, ExternalLink, CheckCircle, Globe, Key, UserCheck, AlertTriangle } from 'lucide-react';
import Navbar from './Navbar';
import Footer from './Footer';
import BrandVerificationBadge from './BrandVerificationBadge';

export default function PrivacyPolicy({ setCurrentView, scrollTo, openLegalModal }) {
  const OFFICIAL_PHONE = "+91 9812947813";
  const OFFICIAL_EMAIL = "info@mehandaarmy.net";
  const SUPPORT_EMAIL = "mehandaarmy.info@gmail.com";
  const OFFICIAL_WHATSAPP_URL = "https://wa.me/919812947813?text=Hello%20Mehanda%20Army%20Investments%2C%20I%20have%20a%20question%20regarding%20the%20Privacy%20Policy.";

  return (
    <div className="font-sans text-slate-900 bg-slate-50 min-h-screen flex flex-col selection:bg-[#876A2E] selection:text-white">
      {/* Top Navbar */}
      <Navbar
        currentView="privacy-policy"
        setCurrentView={setCurrentView}
        scrollTo={scrollTo}
      />

      {/* Hero Header */}
      <header className="bg-gradient-to-b from-[#081525] via-[#0d2038] to-[#081525] text-white py-12 sm:py-16 border-b border-white/10 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(135,106,46,0.15),transparent_50%)] pointer-events-none" />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 relative z-10">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <button
              onClick={() => setCurrentView ? setCurrentView('home') : (window.location.href = '/')}
              className="inline-flex items-center gap-2 text-xs font-semibold text-gray-300 hover:text-white bg-white/10 hover:bg-white/15 px-3.5 py-1.5 rounded-full backdrop-blur transition-all cursor-pointer"
            >
              <ArrowLeft size={14} /> Back to Home
            </button>
            <div className="flex items-center gap-2 text-xs text-[#D5C292]">
              <ShieldCheck size={16} />
              <span>Official Compliance Document</span>
            </div>
          </div>

          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs uppercase tracking-widest font-bold text-[#876A2E] bg-[#876A2E]/10 px-2.5 py-1 rounded border border-[#876A2E]/30">
              Mehanda Army Investments
            </span>
            <BrandVerificationBadge className="h-4 w-4" />
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white mb-3">
            Privacy Policy & Data Protection Charter
          </h1>
          <p className="text-xs sm:text-sm text-gray-300 max-w-2xl leading-relaxed">
            Effective Date: <strong>November 14, 2026</strong> • Last Updated: <strong>November 14, 2026</strong>
          </p>
          <p className="text-xs sm:text-sm text-gray-300 max-w-2xl leading-relaxed mt-2">
            <strong>Mehanda Army Investments</strong> (&ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;) operates the website <a href="https://mehandaarmy.net" className="text-amber-300 hover:underline">https://mehandaarmy.net</a> and its associated client dashboard, loan facilitation systems, and financial consulting applications. This Privacy Policy details our commitment to transparent data collection, processing, storage, and user rights in full accordance with applicable laws and the <strong>Google API Services User Data Policy</strong>.
          </p>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 py-10 sm:py-14">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-6">

          {/* Quick Summary Card */}
          <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 sm:p-6 text-xs sm:text-sm text-amber-900 leading-relaxed shadow-xs">
            <div className="flex items-center gap-2 font-bold text-amber-950 mb-2">
              <CheckCircle size={16} className="text-amber-700 shrink-0" />
              <span>Core Privacy Commitment</span>
            </div>
            <p>
              Mehanda Army Investments will <strong>never sell, rent, or trade your personal or Google user data</strong> to any third-party advertisers or data brokers. All personal information collected is utilized exclusively to provide requested financial services, authenticate user accounts, and facilitate transparent loan inquiries.
            </p>
          </div>

          {/* Core Policy Articles */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 sm:p-10 space-y-8">

            {/* Section 1 */}
            <section className="space-y-3 pb-6 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-xl bg-[#081525] text-amber-300 font-bold text-sm flex items-center justify-center shrink-0">
                  1
                </span>
                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  Data Collection
                </h2>
              </div>
              <div className="text-xs sm:text-sm text-slate-700 leading-relaxed pl-11 space-y-3">
                <p>
                  <strong>Mehanda Army Investments</strong> collects personal contact details (such as your full name, phone number, and email) solely when voluntarily submitted through our inquiry or account creation forms, client registration, or OAuth identity integrations.
                </p>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                  <h4 className="font-semibold text-slate-900">Categories of Data Collected:</h4>
                  <ul className="list-disc list-inside space-y-1.5 text-slate-600">
                    <li><strong>Account Credentials:</strong> Full name, verified email address, encrypted password, and phone number for SMS OTP verification.</li>
                    <li><strong>Google OAuth Identity Data:</strong> When signing in with Google, we receive basic profile attributes (Google ID, email address, full name, and avatar image URL) as authorized by your Google Account permissions.</li>
                    <li><strong>Financial Consultation & Loan Details:</strong> Information voluntarily provided for Agriculture Farm Loans (Dairy, Sheep, Goat) and Student Loan inquiries, including loan amount requested, purpose, and state/district location.</li>
                    <li><strong>Identity Documents for KYC:</strong> Aadhaar number and PAN details provided voluntarily by applicants strictly for statutory Know-Your-Customer (KYC) loan eligibility verification as mandated by Indian lending guidelines.</li>
                    <li><strong>Technical Telemetry:</strong> Anonymized browser type, operating system, and IP address collected automatically for anti-fraud, rate limiting, and cybersecurity auditing.</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Section 2: Google User Data Policy & Limited Use Disclosure */}
            <section className="space-y-3 pb-6 border-b border-slate-100 bg-blue-50/40 p-4 sm:p-6 rounded-2xl border border-blue-200">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-xl bg-blue-700 text-white font-bold text-sm flex items-center justify-center shrink-0">
                  2
                </span>
                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  Google API User Data & Limited Use Policy Disclosure
                </h2>
              </div>
              <div className="text-xs sm:text-sm text-slate-700 leading-relaxed space-y-3">
                <p>
                  Our application, <strong>Mehanda Army Investments</strong>, uses Google OAuth 2.0 authentication to enable fast, secure, and seamless login for our clients.
                </p>

                <div className="space-y-2">
                  <h4 className="font-bold text-slate-900">Google Data Accessed & Scopes:</h4>
                  <p>We request access exclusively to non-sensitive Google profile scopes:</p>
                  <ul className="list-disc list-inside space-y-1 text-slate-700 pl-2">
                    <li><code>.../auth/userinfo.email</code>: To access your primary Google email address for account identification, login, and dispatch of transaction alerts.</li>
                    <li><code>.../auth/userinfo.profile</code>: To read your name and public profile photo to display on your private Mehanda Army Investments dashboard.</li>
                    <li><code>openid</code>: To verify your identity securely via an authenticated JSON Web Token (JWT).</li>
                  </ul>
                </div>

                <div className="p-3.5 bg-white border border-blue-300 rounded-xl text-blue-950 font-medium">
                  <strong>Google Limited Use Compliance Statement:</strong><br />
                  Mehanda Army Investments&apos; use and transfer to any other app of information received from Google APIs will strictly adhere to the{' '}
                  <a
                    href="https://developers.google.com/terms/api-services-user-data-policy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-700 font-bold underline hover:text-blue-900 inline-flex items-center gap-1"
                  >
                    Google API Services User Data Policy <ExternalLink size={12} />
                  </a>
                  , including the <strong>Limited Use</strong> requirements.
                </div>

                <div className="space-y-2">
                  <h4 className="font-bold text-slate-900">Explicit Restrictions on Google User Data:</h4>
                  <ul className="list-disc list-inside space-y-1.5 text-slate-700 pl-2">
                    <li><strong>No Advertising Use:</strong> We NEVER use Google user data for personalized, retargeted, or interest-based advertising.</li>
                    <li><strong>No Sale to Third Parties:</strong> We NEVER sell, rent, trade, or monetize Google user data to data brokers, advertising agencies, or marketing companies under any circumstances.</li>
                    <li><strong>No Generalized AI Training:</strong> Google user data is NEVER used to train machine learning or generalized AI models.</li>
                    <li><strong>No Human Inspection:</strong> No humans at Mehanda Army Investments are permitted to read your private Google data, except: (a) when you explicitly grant written permission for technical troubleshooting, (b) for necessary cybersecurity audits, or (c) when strictly required by a court order or applicable law.</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Section 3 */}
            <section className="space-y-3 pb-6 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-xl bg-[#081525] text-amber-300 font-bold text-sm flex items-center justify-center shrink-0">
                  3
                </span>
                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  Usage of Information
                </h2>
              </div>
              <div className="text-xs sm:text-sm text-slate-700 leading-relaxed pl-11 space-y-2">
                <p>
                  Submitted information is used strictly to respond to specific financial consultations, maintain client accounts, provide agreed portfolio planning updates, process loan applications, and verify customer identities.
                </p>
                <ul className="list-disc list-inside space-y-1 text-slate-600">
                  <li>To establish, authenticate, and administer your private investment dashboard.</li>
                  <li>To verify loan eligibility and assess Farm/Student loan applications.</li>
                  <li>To send transactional receipts, 6-digit OTP verification codes, and security notifications.</li>
                  <li>To comply with regulatory standards established by Indian financial and IT statutes.</li>
                </ul>
              </div>
            </section>

            {/* Section 4 */}
            <section className="space-y-3 pb-6 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-xl bg-[#081525] text-amber-300 font-bold text-sm flex items-center justify-center shrink-0">
                  4
                </span>
                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  No Third-Party Sales & Sharing Restrictions
                </h2>
              </div>
              <div className="text-xs sm:text-sm text-slate-700 leading-relaxed pl-11 space-y-2">
                <p>
                  We do not sell, rent, or trade client personal information to third-party telemarketers or external advertising networks.
                </p>
                <p>
                  Data is disclosed to third parties strictly under the following narrow circumstances:
                </p>
                <ul className="list-disc list-inside space-y-1 text-slate-600">
                  <li><strong>Licensed Payment Gateways:</strong> When you initiate an online transaction, payment processing is executed via RBI-licensed partners (such as Razorpay and PhonePe) under strict banking confidentiality agreements.</li>
                  <li><strong>Legal & Regulatory Mandates:</strong> Where required by valid legal process, statutory audit, court summons, or regulatory authorities in India.</li>
                </ul>
              </div>
            </section>

            {/* Section 5 */}
            <section className="space-y-3 pb-6 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-xl bg-[#081525] text-amber-300 font-bold text-sm flex items-center justify-center shrink-0">
                  5
                </span>
                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  Security Protocols & Data Retention
                </h2>
              </div>
              <div className="text-xs sm:text-sm text-slate-700 leading-relaxed pl-11 space-y-2">
                <p>
                  Sensitive records are protected using standard 256-bit encryption and access-controlled databases.
                </p>
                <ul className="list-disc list-inside space-y-1 text-slate-600">
                  <li><strong>Encryption in Transit & At Rest:</strong> All web traffic is strictly served over HTTPS with TLS 1.3 encryption. Backend database records and customer profile photos are encrypted using AES-256 storage standards.</li>
                  <li><strong>Row Level Security (RLS):</strong> Database architecture enforces Row Level Security ensuring clients can access strictly their own records.</li>
                  <li><strong>Retention Period:</strong> Personal account information is retained only for as long as your account remains active or as required by applicable tax, statutory, or financial record-keeping laws. Once the retention period lapses, data is securely erased.</li>
                </ul>
              </div>
            </section>

            {/* Section 6: User Rights & Data Deletion */}
            <section className="space-y-3 pb-6 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-xl bg-[#081525] text-amber-300 font-bold text-sm flex items-center justify-center shrink-0">
                  6
                </span>
                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  User Rights, Account Deletion & Revoking Google Access
                </h2>
              </div>
              <div className="text-xs sm:text-sm text-slate-700 leading-relaxed pl-11 space-y-3">
                <p>
                  Every user of Mehanda Army Investments maintains complete ownership and rights over their personal information:
                </p>
                <div className="space-y-2">
                  <h4 className="font-semibold text-slate-900">1. Right to Access and Update:</h4>
                  <p className="text-slate-600">You may review and update your name, phone number, and contact preferences directly inside your Client Dashboard at any time.</p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold text-slate-900">2. Right to Account Deletion (Permanent Erasure):</h4>
                  <p className="text-slate-600">
                    You can request complete deletion of your account and personal records at any time. Simply use the in-app &ldquo;Delete Account&rdquo; setting or email our grievance team at <a href={`mailto:${OFFICIAL_EMAIL}`} className="text-blue-600 underline font-semibold">{OFFICIAL_EMAIL}</a>. We process verified account deletion requests within 30 days.
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold text-slate-900">3. How to Revoke Google Account Access:</h4>
                  <p className="text-slate-600">
                    You can revoke Mehanda Army Investments&apos; access to your Google account at any moment through your Google Account Security Dashboard:
                  </p>
                  <a
                    href="https://myaccount.google.com/permissions"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-medium text-xs border border-slate-300 transition-colors"
                  >
                    Manage Google Account Permissions <ExternalLink size={12} />
                  </a>
                </div>
              </div>
            </section>

            {/* Section 7: Grievance Redressal */}
            <section className="space-y-3 pt-2">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-xl bg-[#50745A] text-white font-bold text-sm flex items-center justify-center shrink-0">
                  7
                </span>
                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  Grievance Redressal & Contact Desk
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed pl-11">
                Clients experiencing service issues, privacy inquiries, or seeking clarification may contact our designated grievance team directly:
              </p>
              
              <div className="ml-11 bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3 text-xs sm:text-sm text-slate-800">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <span className="text-slate-500 block text-[11px] uppercase tracking-wider font-semibold">Entity Name</span>
                    <strong className="text-slate-900">Mehanda Army Investments</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px] uppercase tracking-wider font-semibold">Application Name</span>
                    <strong className="text-slate-900">Mehanda Army Investments</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px] uppercase tracking-wider font-semibold">Official Website</span>
                    <a href="https://mehandaarmy.net" target="_blank" rel="noopener noreferrer" className="text-blue-700 hover:underline font-semibold">
                      https://mehandaarmy.net
                    </a>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px] uppercase tracking-wider font-semibold">Grievance Officer</span>
                    <strong className="text-slate-900">Deepak Jangra</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px] uppercase tracking-wider font-semibold">Response Turnaround</span>
                    <strong className="text-slate-900">Within 48 business hours</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px] uppercase tracking-wider font-semibold">Official Phone / WhatsApp</span>
                    <a href={`tel:${OFFICIAL_PHONE.replace(/\s+/g, '')}`} className="text-[#876A2E] hover:underline font-bold inline-flex items-center gap-1.5">
                      <Phone size={13} /> {OFFICIAL_PHONE}
                    </a>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px] uppercase tracking-wider font-semibold">Official Email</span>
                    <a href={`mailto:${OFFICIAL_EMAIL}`} className="text-[#50745A] hover:underline font-bold inline-flex items-center gap-1.5">
                      <Mail size={13} /> {OFFICIAL_EMAIL}
                    </a>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px] uppercase tracking-wider font-semibold">Support Email</span>
                    <a href={`mailto:${SUPPORT_EMAIL}`} className="text-[#50745A] hover:underline font-bold inline-flex items-center gap-1.5">
                      <Mail size={13} /> {SUPPORT_EMAIL}
                    </a>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-slate-500 block text-[11px] uppercase tracking-wider font-semibold">Registered Office Address</span>
                    <span className="text-slate-800">Haryana, India</span>
                  </div>
                </div>
              </div>
            </section>

          </div>

          {/* Cross-Link Card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Need to review our Client Terms?</h3>
              <p className="text-xs text-slate-600">Review our complete Terms & Conditions governing engagement and portal access.</p>
            </div>
            <a
              href="/terms-and-conditions"
              onClick={(e) => {
                e.preventDefault();
                if (setCurrentView) setCurrentView('terms-and-conditions');
                else window.location.href = '/terms-and-conditions';
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#081525] hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              <FileText size={14} /> View Terms & Conditions
            </a>
          </div>

        </div>
      </main>

      {/* Official Footer */}
      <Footer
        scrollTo={scrollTo}
        openLegalModal={openLegalModal}
        setCurrentView={setCurrentView}
      />
    </div>
  );
}
