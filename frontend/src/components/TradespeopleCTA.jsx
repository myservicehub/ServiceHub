import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const TradespeopleCTA = () => {
  const [openFaq, setOpenFaq] = useState(0);

  const faqs = [
    {
      question: 'How do I sign up as a tradesperson?',
      answer: 'Simply click "Join as Tradesperson" and complete your profile with your skills, experience, and service areas. Verification takes 24-48 hours.'
    },
    {
      question: 'Is it free to join ServiceHub?',
      answer: 'Yes! Signing up is completely free. You only pay a small commission when you successfully complete a job through our platform.'
    },
    {
      question: 'How do I receive job leads?',
      answer: 'Once verified, you\'ll receive notifications for jobs matching your skills and location. You can accept or decline based on your availability.'
    },
    {
      question: 'How do payments work?',
      answer: 'Customers pay through our secure platform. Funds are released to your account within 24 hours of job completion and customer approval.'
    },
    {
      question: 'Can I set my own rates?',
      answer: 'Absolutely! You have full control over your pricing. Set hourly rates or project-based quotes that reflect your expertise.'
    }
  ];

  const toggleFaq = (index) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  return (
    <section className="relative py-16 lg:py-20 bg-gray-50 overflow-hidden">
      <div className="container relative z-10 mx-auto px-6 md:px-8 lg:px-12">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-start">
            
            {/* Left - Large Signpost Image (fixed height to prevent resize on accordion toggle) */}
            <div className="relative h-[400px] lg:h-[520px] rounded-2xl overflow-hidden shadow-xl flex-shrink-0">
              <img 
                src="/mockup/signpost.jpg" 
                alt="ServiceHub Direction" 
                className="absolute inset-0 w-full h-full object-cover"
                loading="lazy"
              />
            </div>

            {/* Right - FAQ */}
            <div className="flex flex-col justify-center py-4">
              <span className="text-[#34D164] text-sm font-semibold font-lato tracking-wider uppercase mb-3">
                FAQ
              </span>

              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold font-montserrat text-[#121E3C] mb-3 leading-tight">
                Got questions?
              </h2>
              
              <p className="text-gray-500 font-lato mb-6">
                Everything you need to know about ServiceHub.
              </p>

              {/* FAQ Accordions */}
              <div className="space-y-2">
                {faqs.map((faq, index) => (
                  <div 
                    key={index} 
                    className={`rounded-xl overflow-hidden transition-all duration-200 ${
                      openFaq === index ? 'bg-white shadow-md' : 'bg-white/60'
                    }`}
                  >
                    <button
                      onClick={() => toggleFaq(index)}
                      className="w-full flex items-center justify-between p-4 text-left"
                    >
                      <span className={`font-medium font-lato text-sm pr-4 transition-colors ${
                        openFaq === index ? 'text-[#121E3C]' : 'text-gray-600'
                      }`}>
                        {faq.question}
                      </span>
                      <ChevronDown 
                        className={`w-4 h-4 flex-shrink-0 transition-all duration-200 ${
                          openFaq === index ? 'rotate-180 text-[#34D164]' : 'text-gray-400'
                        }`} 
                      />
                    </button>
                    <div 
                      className={`overflow-hidden transition-all duration-200 ${
                        openFaq === index ? 'max-h-32 pb-4' : 'max-h-0'
                      }`}
                    >
                      <p className="px-4 text-sm text-gray-500 font-lato leading-relaxed">
                        {faq.answer}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
};

export default TradespeopleCTA;
