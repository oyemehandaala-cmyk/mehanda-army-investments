import React from 'react';
import { Target, Compass, Eye, ShieldCheck, Check } from 'lucide-react';

export default function About() {
  return (
    <section id="about" className="py-20 md:py-28 bg-[#F4F7FA]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Heading */}
        <div className="max-w-3xl mx-auto text-center mb-16">
          <span className="text-xs font-bold uppercase tracking-widest text-[#FF851B] block mb-2">
            Who We Are & What We Believe
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#081525] tracking-tight">
            Structure, Transparency & Long-Term Discipline
          </h2>
          <div className="w-16 h-1 bg-[#00C995] mx-auto mt-4 rounded-full"></div>
          <p className="mt-4 text-base text-gray-600 leading-relaxed font-normal">
            At <strong className="text-[#081525]">Mehanda Army Investments</strong>, we serve clients who seek clarity and consistency over speculative shortcuts. We believe that lasting wealth is built through structured risk budgeting, disciplined monthly compounding, and honest fiduciary guidance.
          </p>
        </div>

        {/* 3 Core Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {/* Pillar 1 */}
          <div className="bg-white p-8 rounded-2xl border border-gray-200/80 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-[#FF851B]/10 rounded-xl flex items-center justify-center text-[#FF851B] mb-5">
              <Compass size={24} />
            </div>
            <h3 className="text-xl font-bold text-[#081525] mb-2">Our Mission</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              To provide working professionals, armed forces veterans, and families with a reliable, structured investment framework that prioritizes capital preservation while capturing long-term market growth.
            </p>
          </div>

          {/* Pillar 2 */}
          <div className="bg-white p-8 rounded-2xl border border-gray-200/80 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-[#00C995]/10 rounded-xl flex items-center justify-center text-[#00C995] mb-5">
              <Eye size={24} />
            </div>
            <h3 className="text-xl font-bold text-[#081525] mb-2">Unwavering Transparency</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              We operate with total clarity. No hidden commissions, no artificial yield promises, and no opaque arrangements. All assets remain securely held in your name with regulated depository institutions.
            </p>
          </div>

          {/* Pillar 3 */}
          <div className="bg-white p-8 rounded-2xl border border-gray-200/80 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-[#10243B]/10 rounded-xl flex items-center justify-center text-[#10243B] mb-5">
              <Target size={24} />
            </div>
            <h3 className="text-xl font-bold text-[#081525] mb-2">Disciplined Execution</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              Market noise and emotional reactions are the biggest threats to returns. We enforce disciplined rebalancing, multi-asset diversification, and periodic reviews to keep your portfolio on course.
            </p>
          </div>
        </div>

        {/* Ethical Standards Commitment */}
        <div className="bg-[#081525] text-white rounded-3xl p-8 sm:p-10 border border-white/10 shadow-xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-8">
              <h4 className="text-xl sm:text-2xl font-bold text-white mb-3">
                Our Ethical Commitment to Every Client
              </h4>
              <p className="text-sm text-gray-300 leading-relaxed mb-6 font-normal">
                We believe trust is earned through factual representations. We never make speculative claims, fabricate performance records, or guarantee future returns. Your financial peace of mind is our primary measure of success.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-gray-300">
                <div className="flex items-center gap-2">
                  <Check size={16} className="text-[#00C995]" /> Regulated depository custodians
                </div>
                <div className="flex items-center gap-2">
                  <Check size={16} className="text-[#00C995]" /> Personalized risk-profiling first
                </div>
                <div className="flex items-center gap-2">
                  <Check size={16} className="text-[#00C995]" /> Direct communication with advisors
                </div>
                <div className="flex items-center gap-2">
                  <Check size={16} className="text-[#00C995]" /> Continuous portfolio monitoring
                </div>
              </div>
            </div>

            <div className="lg:col-span-4 bg-[#10243B] p-6 rounded-2xl border border-white/10 text-center">
              <ShieldCheck size={36} className="text-[#00C995] mx-auto mb-3" />
              <h5 className="font-bold text-white text-base">Direct Client Advisory Desk</h5>
              <p className="text-xs text-gray-300 mt-1 mb-4">
                Have questions regarding our approach? Speak with our team.
              </p>
              <a 
                href="tel:+919812947813"
                className="inline-block w-full py-2.5 bg-[#FF851B] hover:bg-orange-600 text-white font-bold rounded-xl text-xs transition-colors shadow-sm"
              >
                Call +91 9812947813
              </a>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
