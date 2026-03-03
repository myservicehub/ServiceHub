import React, { useState } from 'react';
import { Bell, Smartphone, Zap } from 'lucide-react';

const AppSection = () => {
  const [email, setEmail] = useState('');

  const features = [
    { icon: Smartphone, text: 'Manage jobs on the go' },
    { icon: Bell, text: 'Instant notifications' },
    { icon: Zap, text: 'Quick messaging' }
  ];

  const handleNotify = (e) => {
    e.preventDefault();
    if (email) {
      alert('Thanks! We\'ll notify you when the app launches.');
      setEmail('');
    }
  };

  return (
    <section className="relative py-20 lg:py-24 bg-white overflow-hidden">
      <div className="container relative z-10 mx-auto px-6 md:px-8 lg:px-12">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-stretch">
            
            {/* Left - Content */}
            <div className="flex flex-col justify-center order-2 lg:order-1">
              <span className="text-[#34D164] text-sm font-semibold font-lato tracking-wider uppercase mb-3">
                Mobile App
              </span>

              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold font-montserrat text-[#121E3C] mb-4 leading-tight">
                ServiceHub in your pocket
              </h2>
              
              <p className="text-gray-500 font-lato mb-8 leading-relaxed">
                Manage your jobs, chat with tradespeople, and get instant updates — all from your phone. Our mobile app is launching soon.
              </p>

              {/* Feature pills */}
              <div className="flex flex-wrap gap-3 mb-8">
                {features.map((feature, index) => {
                  const IconComponent = feature.icon;
                  return (
                    <div 
                      key={index} 
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gray-100 text-gray-700 text-sm font-lato"
                    >
                      <IconComponent className="w-4 h-4 text-[#34D164]" />
                      {feature.text}
                    </div>
                  );
                })}
              </div>

              {/* Email signup */}
              <form onSubmit={handleNotify} className="flex flex-col sm:flex-row gap-3">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="flex-1 px-4 py-3 rounded-xl border border-gray-200 focus:border-[#34D164] focus:ring-2 focus:ring-[#34D164]/20 outline-none text-sm font-lato transition-all"
                />
                <button
                  type="submit"
                  className="px-6 py-3 bg-[#121E3C] hover:bg-[#1a2d52] text-white text-sm font-medium font-lato rounded-xl transition-colors"
                >
                  Notify me
                </button>
              </form>
              <p className="text-xs text-gray-400 font-lato mt-3">
                We'll let you know when the app is ready. No spam.
              </p>
            </div>

            {/* Right - Coming Soon Image */}
            <div className="relative h-[400px] lg:h-auto lg:min-h-[480px] rounded-2xl overflow-hidden shadow-xl order-1 lg:order-2">
              <img 
                src="/coming-soon.jpg" 
                alt="ServiceHub Mobile App Coming Soon" 
                className="absolute inset-0 w-full h-full object-cover"
                loading="lazy"
              />
              {/* Overlay with coming soon badge */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#121E3C]/60 via-transparent to-transparent" />
              <div className="absolute bottom-6 left-6">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#34D164] text-white text-xs font-semibold font-lato">
                  <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                  Coming Soon
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
};

export default AppSection;
