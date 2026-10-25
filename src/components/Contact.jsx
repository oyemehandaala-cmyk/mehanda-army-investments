import React, { useState } from 'react';
import { Phone, Mail, MessageCircle, MapPin, Send, CheckCircle2, ShieldCheck, AlertCircle } from 'lucide-react';

export default function Contact() {
  const [formState, setFormState] = useState({
    fullName: '',
    phone: '',
    email: '',
    serviceInterest: 'Portfolio Planning & Blueprinting',
    message: '',
    consent: true
  });
  const [status, setStatus] = useState('idle'); // idle, loading, success
  const [formError, setFormError] = useState('');

  const OFFICIAL_PHONE = "+91 9812947813";
  const OFFICIAL_WHATSAPP_URL = "https://wa.me/919812947813?text=Hello%20Mehanda%20Army%20Investments%2C%20I%20would%20like%20to%20request%20a%20portfolio%20consultation.";
  const OFFICIAL_EMAIL = "Info@mehandaarmy.in";

  const handleChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFormState({ ...formState, [e.target.name]: value });
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (!formState.fullName.trim() || !formState.phone.trim()) {
      setFormError('Please provide your name and phone number.');
      return;
    }
    setFormError('');
    setStatus('loading');

    setTimeout(() => {
      setStatus('success');
      // Format WhatsApp enquiry text
      const inquiryText = encodeURIComponent(
        `Hello Mehanda Army Investments!\n` +
        `Name: ${formState.fullName}\n` +
        `Phone: ${formState.phone}\n` +
        `Email: ${formState.email || 'Not provided'}\n` +
        `Interest: ${formState.serviceInterest}\n` +
        `Message: ${formState.message || 'I would like to schedule a consultation.'}`
      );
      // Auto-trigger WhatsApp connector after 800ms
      setTimeout(() => {
        window.open(`https://wa.me/919812947813?text=${inquiryText}`, '_blank');
      }, 800);
    }, 900);
  };

  return (
    <section id="contact" className="py-20 md:py-28 bg-[#F4F7FA]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Heading */}
        <div className="max-w-3xl mx-auto text-center mb-16">
          <span className="text-xs font-bold uppercase tracking-widest text-[#FF851B] block mb-2">
            Direct Advisor Desk
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#081525] tracking-tight">
            Schedule a Confidential Consultation
          </h2>
          <div className="w-16 h-1 bg-[#00C995] mx-auto mt-4 rounded-full"></div>
          <p className="mt-4 text-base text-gray-600 leading-relaxed font-normal">
            Speak directly with our strategic wealth advisory desk. We are available to answer queries, review existing portfolio structures, and design customized investment blueprints.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          
          {/* Left Column: Official Contact Channels */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Phone Card */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-orange-50 text-[#FF851B] flex items-center justify-center flex-shrink-0">
                <Phone size={22} />
              </div>
              <div>
                <h4 className="font-bold text-[#081525] text-base">Direct Phone Desk</h4>
                <a 
                  href={`tel:${OFFICIAL_PHONE.replace(/\s+/g, '')}`} 
                  className="text-gray-700 font-semibold text-sm hover:text-[#FF851B] transition-colors mt-0.5 block"
                >
                  {OFFICIAL_PHONE}
                </a>
                <p className="text-xs text-gray-400 mt-1">Available Mon–Sat, 9:30 AM – 6:30 PM IST</p>
              </div>
            </div>

            {/* WhatsApp Card */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-green-50 text-[#25D366] flex items-center justify-center flex-shrink-0">
                <MessageCircle size={22} />
              </div>
              <div>
                <h4 className="font-bold text-[#081525] text-base">Instant WhatsApp Advisory</h4>
                <p className="text-xs text-gray-500 mt-0.5 mb-2">Direct messaging channel for consultation scheduling</p>
                <a 
                  href={OFFICIAL_WHATSAPP_URL} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#25D366] hover:bg-emerald-600 text-white font-bold text-xs rounded-lg transition-colors shadow-sm"
                >
                  <MessageCircle size={14} /> Open WhatsApp Chat
                </a>
              </div>
            </div>

            {/* Email Card */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-teal-50 text-[#00C995] flex items-center justify-center flex-shrink-0">
                <Mail size={22} />
              </div>
              <div>
                <h4 className="font-bold text-[#081525] text-base">Official Email</h4>
                <a 
                  href={`mailto:${OFFICIAL_EMAIL}`} 
                  className="text-gray-700 font-semibold text-sm hover:text-[#00C995] transition-colors mt-0.5 block"
                >
                  {OFFICIAL_EMAIL}
                </a>
                <p className="text-xs text-gray-400 mt-1">Written inquiries replied within 1 business day</p>
              </div>
            </div>

            {/* Security Verification Reminder */}
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-start gap-3 text-xs text-amber-900 leading-relaxed">
              <ShieldCheck size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
              <p>
                <strong>Security Verification:</strong> Always confirm you are communicating with verified representatives via {OFFICIAL_PHONE}. We never request OTPs, ATM PINs, or direct personal UPI payments.
              </p>
            </div>

          </div>

          {/* Right Column: Contact & Callback Form */}
          <div className="lg:col-span-7 bg-white p-8 sm:p-10 rounded-3xl border border-gray-200 shadow-xl">
            <h3 className="text-2xl font-bold text-[#081525] mb-2">Request an Advisory Consultation</h3>
            <p className="text-xs sm:text-sm text-gray-500 mb-6">
              Complete the form below to receive a personalized portfolio review callback.
            </p>

            {status === 'success' ? (
              <div className="bg-emerald-50 border border-emerald-300 rounded-2xl p-8 text-center animate-fadeIn">
                <CheckCircle2 size={48} className="text-[#00C995] mx-auto mb-3" />
                <h4 className="text-xl font-bold text-emerald-950 mb-1">Inquiry Received</h4>
                <p className="text-xs text-emerald-700 mb-4 max-w-sm mx-auto">
                  Thank you, <strong>{formState.fullName}</strong>. Opening WhatsApp to connect you directly with your relationship desk...
                </p>
                <a 
                  href={OFFICIAL_WHATSAPP_URL} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#25D366] hover:bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-md transition-colors"
                >
                  <MessageCircle size={15} /> Continue to WhatsApp
                </a>
              </div>
            ) : (
              <form onSubmit={handleFormSubmit} className="space-y-4">
                {formError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 flex items-center gap-2">
                    <AlertCircle size={16} />
                    <span>{formError}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                      Full Name *
                    </label>
                    <input 
                      type="text" 
                      required
                      name="fullName"
                      placeholder="e.g. Ramesh Kumar"
                      value={formState.fullName}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-[#FF851B] outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                      Mobile / WhatsApp Phone *
                    </label>
                    <input 
                      type="tel" 
                      required
                      name="phone"
                      placeholder="e.g. +91 98765 43210"
                      value={formState.phone}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-[#FF851B] outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                    Email Address (Optional)
                  </label>
                  <input 
                    type="email" 
                    name="email"
                    placeholder="e.g. ramesh@example.com"
                    value={formState.email}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-[#FF851B] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                    Primary Service Focus
                  </label>
                  <select 
                    name="serviceInterest"
                    value={formState.serviceInterest}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-[#FF851B] outline-none bg-white"
                  >
                    <option>Portfolio Planning & Blueprinting</option>
                    <option>Retirement & Wealth Advisory Strategies</option>
                    <option>Capital Preservation & Downside Hedging</option>
                    <option>Defense Personnel Specialized Planning</option>
                    <option>General Wealth Consultation</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                    Message or Portfolio Questions
                  </label>
                  <textarea 
                    name="message"
                    rows="3"
                    placeholder="Tell us about your investment horizon or target goals..."
                    value={formState.message}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-[#FF851B] outline-none resize-none"
                  ></textarea>
                </div>

                <div className="flex items-start gap-2 pt-1">
                  <input 
                    type="checkbox"
                    id="consent"
                    name="consent"
                    checked={formState.consent}
                    onChange={handleChange}
                    required
                    className="mt-1 accent-[#FF851B]"
                  />
                  <label htmlFor="consent" className="text-xs text-gray-500 leading-tight">
                    I authorize Mehanda Army Investments to reach out to me regarding this specific consultation query.
                  </label>
                </div>

                <button 
                  type="submit"
                  disabled={status === 'loading'}
                  className="w-full py-3.5 bg-[#FF851B] hover:bg-orange-600 text-white font-bold rounded-xl text-sm transition-all shadow-md shadow-orange-500/20 flex items-center justify-center gap-2 mt-2 active:scale-95 disabled:bg-gray-400"
                >
                  {status === 'loading' ? (
                    'Connecting...'
                  ) : (
                    <>
                      <Send size={16} /> Submit & Connect on WhatsApp
                    </>
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
