import React, { useState } from 'react';
import { Phone, Mail, MessageCircle, MapPin, Send, CheckCircle2, ShieldCheck, AlertCircle, Copy, ExternalLink } from 'lucide-react';
import { buildWhatsAppEnquiryUrl } from '../lib/whatsappEnquiry.js';
import EmailOtpVerification from './EmailOtpVerification.jsx';

export default function Contact() {
  const [formState, setFormState] = useState({
    fullName: '',
    phone: '',
    email: '',
    serviceInterest: '',
    message: '',
    consent: false
  });
  const [emailVerification, setEmailVerification] = useState(() => ({
    isVerified: false,
    verifiedEmail: '',
    verifiedAt: null,
    token: '',
  }));
  const [status, setStatus] = useState('idle'); // idle, loading, success, error
  const [formError, setFormError] = useState('');
  const [trackingId, setTrackingId] = useState('');
  const [submittedEnquiry, setSubmittedEnquiry] = useState(null);
  const [copied, setCopied] = useState(false);

  const OFFICIAL_PHONE = "+91 9812947813";
  const OFFICIAL_WHATSAPP_URL = "https://wa.me/919812947813?text=Hello%20Mehanda%20Army%20Investments%2C%20I%20would%20like%20to%20request%20a%20portfolio%20consultation.";
  const OFFICIAL_EMAIL = "info@mehandaarmy.net";

  const handleChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFormState({ ...formState, [e.target.name]: value });
  };

  const handleCopyTracking = () => {
    if (trackingId) {
      navigator.clipboard.writeText(trackingId).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!formState.fullName.trim() || !formState.phone.trim()) {
      setFormError('Please provide your name and phone number.');
      return;
    }
    if (!formState.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formState.email.trim())) {
      setFormError('Please provide a valid Gmail / email address.');
      return;
    }
    if (
      !emailVerification.isVerified ||
      !emailVerification.verifiedEmail ||
      emailVerification.verifiedEmail.toLowerCase() !== formState.email.trim().toLowerCase()
    ) {
      setFormError('Please verify your Gmail / email address with OTP before submitting.');
      return;
    }
    if (!formState.consent) {
      setFormError('Please provide your consent to contact before submitting.');
      return;
    }
    setFormError('');
    setStatus('loading');

    try {
      const response = await fetch('/api/contact-enquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: formState.fullName,
          phone: formState.phone,
          email: formState.email.trim(),
          emailVerificationToken: emailVerification.token,
          verifiedEmail: emailVerification.verifiedEmail,
          emailVerifiedAt: emailVerification.verifiedAt,
          serviceInterest: formState.serviceInterest || undefined,
          message: formState.message || undefined,
          consent: formState.consent,
        }),
        cache: 'no-store',
      });

      let data;
      try { data = await response.json(); } catch { data = {}; }

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit enquiry. Please try again.');
      }

      setTrackingId(data.trackingId || '');
      setSubmittedEnquiry({ ...formState });
      setStatus('success');
    } catch (err) {
      console.error('[Contact] submission error', err);
      setFormError(err.message || 'Unable to submit. Please try again or contact us directly.');
      setStatus('error');
    }
  };

  return (
    <section id="contact" className="relative py-16 md:py-24 bg-slate-50 text-slate-900 border-b border-slate-200 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="max-w-3xl mx-auto text-center mb-12">
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full border border-blue-200 bg-blue-50 text-xs font-bold uppercase tracking-wider text-blue-700 mb-3 shadow-xs">
            ★ Direct Client Helpdesk
          </span>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight">
            Connect With Our Financial Advisors
          </h2>
          <div className="w-16 h-1 bg-blue-600 mx-auto mt-3 rounded-full"></div>
          <p className="mt-3 text-sm sm:text-base text-slate-600 leading-relaxed font-normal">
            Speak directly with our team for loan enquiries, eligibility assessment, or customized wealth portfolio consultation.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Official Contact Channels */}
          <div className="lg:col-span-5 space-y-4">
            
            {/* Phone Card */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex items-start gap-4">
              <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center shrink-0">
                <Phone size={20} />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm">Direct Phone Helpline</h4>
                <a 
                  href={`tel:${OFFICIAL_PHONE.replace(/\s+/g, '')}`} 
                  className="text-blue-700 font-bold text-base hover:text-blue-800 transition-colors mt-0.5 block font-mono"
                >
                  {OFFICIAL_PHONE}
                </a>
                <p className="text-xs text-slate-500 mt-0.5">Available Mon–Sat, 9:30 AM – 6:30 PM IST</p>
              </div>
            </div>

            {/* WhatsApp Card */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex items-start gap-4">
              <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center shrink-0">
                <MessageCircle size={20} />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm">Instant WhatsApp Advisory</h4>
                <p className="text-xs text-slate-500 mt-0.5 mb-2.5">Fast-track response for loan and wealth enquiries</p>
                <a 
                  href={OFFICIAL_WHATSAPP_URL} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#25D366] hover:bg-emerald-600 text-white font-bold text-xs rounded-xl transition-all shadow-xs active:scale-95"
                >
                  <MessageCircle size={14} /> Open WhatsApp Chat
                </a>
              </div>
            </div>

            {/* Email Card */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex items-start gap-4">
              <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center justify-center shrink-0">
                <Mail size={20} />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm">Official Corporate Email</h4>
                <a 
                  href={`mailto:${OFFICIAL_EMAIL}`} 
                  className="text-blue-700 font-bold text-sm hover:text-blue-800 transition-colors mt-0.5 block font-mono"
                >
                  {OFFICIAL_EMAIL}
                </a>
                <p className="text-xs text-slate-500 mt-0.5">Formal enquiries replied within 1 business day</p>
              </div>
            </div>

            {/* Security Verification Reminder */}
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3 text-xs text-amber-900 leading-relaxed shadow-xs">
              <ShieldCheck size={18} className="text-amber-700 shrink-0 mt-0.5" />
              <p>
                <strong className="text-amber-800">Security Verification:</strong> Always verify that you are communicating with authorized officers via {OFFICIAL_PHONE} or {OFFICIAL_EMAIL}. We never request OTPs, passwords, or personal account UPI transfers.
              </p>
            </div>

          </div>

          {/* Right Column: Contact & Callback Form */}
          <div className="lg:col-span-7 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-lg">
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 mb-1">Request an Advisory Consultation</h3>
            <p className="text-xs text-slate-500 mb-5">
              Fill out the details below to receive a call from our dedicated advisory desk.
            </p>

            {status === 'success' ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-center animate-fadeIn">
                <CheckCircle2 size={42} className="text-emerald-600 mx-auto mb-2" />
                <h4 className="text-lg font-black text-slate-900 mb-1">Consultation Request Received</h4>
                <p className="text-xs text-slate-600 mb-4 max-w-sm mx-auto">
                  Your enquiry has been successfully logged. An advisory manager will contact you shortly.
                </p>
                {trackingId && (
                  <div className="bg-white border border-emerald-300 rounded-xl p-3 mb-4 inline-block min-w-[200px] shadow-xs">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">Your Reference Number</p>
                    <div className="flex items-center justify-center gap-2">
                      <span className="font-mono font-black text-blue-700 text-sm">{trackingId}</span>
                      <button
                        type="button"
                        onClick={handleCopyTracking}
                        title="Copy reference"
                        className="text-slate-600 hover:text-slate-900 cursor-pointer"
                      >
                        {copied ? <CheckCircle2 size={14} className="text-emerald-600" /> : <Copy size={14} />}
                      </button>
                    </div>
                  </div>
                )}
                <div className="flex flex-col sm:flex-row gap-2.5 justify-center">
                  <a
                    href={buildWhatsAppEnquiryUrl(submittedEnquiry)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-[#25D366] hover:bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
                  >
                    <MessageCircle size={14} /> Continue on WhatsApp
                  </a>
                  <button
                    type="button"
                    onClick={() => { setStatus('idle'); setFormState({ fullName: '', phone: '', email: '', serviceInterest: '', message: '', consent: false }); setTrackingId(''); }}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                  >
                    Submit Another Enquiry
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleFormSubmit} className="space-y-4">
                {formError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
                    <AlertCircle size={15} className="text-red-600 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Full Name *
                    </label>
                    <input 
                      type="text" 
                      required
                      name="fullName"
                      value={formState.fullName}
                      onChange={handleChange}
                      placeholder=""
                      className="w-full h-[42px] px-3.5 bg-white border border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-100 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all shadow-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Mobile / WhatsApp Phone *
                    </label>
                    <input 
                      type="tel" 
                      required
                      name="phone"
                      value={formState.phone}
                      onChange={handleChange}
                      placeholder=""
                      className="w-full h-[42px] px-3.5 bg-white border border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-100 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all shadow-xs"
                    />
                  </div>
                </div>

                <div>
                  <EmailOtpVerification
                    email={formState.email}
                    onChangeEmail={(val) => setFormState((prev) => ({ ...prev, email: val }))}
                    isVerified={emailVerification.isVerified}
                    verifiedEmail={emailVerification.verifiedEmail}
                    verifiedAt={emailVerification.verifiedAt}
                    onVerified={(res) => {
                      setEmailVerification({
                        isVerified: true,
                        verifiedEmail: res.email,
                        verifiedAt: res.verifiedAt,
                        token: res.verificationToken,
                      });
                      setFormError('');
                    }}
                    onReset={() => {
                      setEmailVerification({
                        isVerified: false,
                        verifiedEmail: '',
                        verifiedAt: null,
                        token: '',
                      });
                    }}
                    purpose="Advisory Consultation Enquiry"
                    label="Gmail / Email Address *"
                    hint="A real 6-digit OTP will be sent to your Gmail / email address for verification."
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Primary Service Focus
                  </label>
                  <select 
                    name="serviceInterest"
                    value={formState.serviceInterest}
                    onChange={handleChange}
                    className="w-full h-[42px] px-3.5 bg-white border border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-100 rounded-xl text-sm text-slate-900 outline-none transition-all shadow-xs"
                  >
                    <option value="">Select a service category</option>
                    <option>Student Education Loan</option>
                    <option>Dairy Farming Loan</option>
                    <option>Sheep Farming Loan</option>
                    <option>Goat Farming Loan</option>
                    <option>Strategic Wealth Investment</option>
                    <option>General Financial Advisory</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Message or Query
                  </label>
                  <textarea 
                    name="message"
                    rows="3"
                    value={formState.message}
                    onChange={handleChange}
                    placeholder=""
                    className="w-full p-3 bg-white border border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-100 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 outline-none resize-none transition-all shadow-xs"
                  ></textarea>
                </div>

                <div className="flex items-start gap-2.5 pt-1">
                  <input 
                    type="checkbox" 
                    id="consent"
                    name="consent"
                    checked={formState.consent}
                    onChange={handleChange}
                    required
                    className="mt-1 accent-blue-600"
                  />
                  <label htmlFor="consent" className="text-xs text-slate-600 leading-tight">
                    I authorize Mehanda Army Investments to reach out to me regarding this specific consultation request.
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={status === 'loading'}
                  className="w-full h-[44px] bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition-all shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 mt-2 active:scale-98 disabled:opacity-50 cursor-pointer"
                >
                  {status === 'loading' ? (
                    <><span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" /> Submitting...</>
                  ) : (
                    <><Send size={15} /> Submit Consultation Request →</>
                  )}
                </button>
              </form>
            )}

          </div>

        </div>

      </div>
    </section>
  );
}
