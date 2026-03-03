import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { Rocket, ArrowLeft, Bell, Home, Briefcase } from 'lucide-react';

const ComingSoonPage = () => {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const feature = searchParams.get('feature') || 'This feature';

  return (
    <div className="min-h-screen bg-[#F5F5F7]">
      <Header />
      
      {/* Hero Section */}
      <section className="relative bg-[#121E3C] py-20 md:py-32 overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px),
              linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '40px 40px'
          }} />
        </div>
        
        {/* Decorative Elements */}
        <div className="absolute top-20 left-10 w-20 h-20 rounded-full bg-[#34D164]/20 blur-2xl" />
        <div className="absolute bottom-20 right-10 w-32 h-32 rounded-full bg-[#34D164]/10 blur-3xl" />
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-2xl mx-auto text-center">
            {/* Animated Icon */}
            <div className="relative inline-block mb-8">
              <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-[#34D164] to-[#2ab854] flex items-center justify-center mx-auto shadow-lg shadow-[#34D164]/30">
                <Rocket size={48} className="text-white animate-bounce" />
              </div>
              <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-yellow-400 flex items-center justify-center">
                <span className="text-xs">✨</span>
              </div>
            </div>
            
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Coming Soon
            </h1>
            
            <p className="text-white/70 text-lg md:text-xl mb-4">
              {feature} is currently under development.
            </p>
            
            <p className="text-white/50 text-base mb-10">
              We're working hard to bring you something amazing. Stay tuned for updates!
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link 
                to="/"
                className="flex items-center gap-2 px-6 py-3 bg-[#34D164] hover:bg-[#2ab854] text-white rounded-xl font-medium transition-colors"
              >
                <Home size={18} />
                Go to Homepage
              </Link>
              <button 
                onClick={() => window.history.back()}
                className="flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-medium transition-colors"
              >
                <ArrowLeft size={18} />
                Go Back
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Info Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Card 1 */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-center">
                <div className="w-12 h-12 rounded-xl bg-[#34D164]/10 flex items-center justify-center mx-auto mb-4">
                  <Bell size={24} className="text-[#34D164]" />
                </div>
                <h3 className="font-semibold text-[#121E3C] mb-2">Get Notified</h3>
                <p className="text-sm text-gray-500">
                  Subscribe to our newsletter to be the first to know when we launch.
                </p>
              </div>
              
              {/* Card 2 */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-center">
                <div className="w-12 h-12 rounded-xl bg-[#34D164]/10 flex items-center justify-center mx-auto mb-4">
                  <Briefcase size={24} className="text-[#34D164]" />
                </div>
                <h3 className="font-semibold text-[#121E3C] mb-2">Explore Services</h3>
                <p className="text-sm text-gray-500">
                  Browse our available trade categories and find skilled professionals.
                </p>
              </div>
              
              {/* Card 3 */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-center">
                <div className="w-12 h-12 rounded-xl bg-[#34D164]/10 flex items-center justify-center mx-auto mb-4">
                  <Rocket size={24} className="text-[#34D164]" />
                </div>
                <h3 className="font-semibold text-[#121E3C] mb-2">Join Us</h3>
                <p className="text-sm text-gray-500">
                  Become a tradesperson on ServiceHub and grow your business.
                </p>
              </div>
            </div>

            {/* Quick Links */}
            <div className="mt-12 text-center">
              <p className="text-gray-500 mb-4">In the meantime, check out:</p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <Link 
                  to="/trade-categories" 
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-[#121E3C] rounded-lg text-sm font-medium transition-colors"
                >
                  Trade Categories
                </Link>
                <Link 
                  to="/blog" 
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-[#121E3C] rounded-lg text-sm font-medium transition-colors"
                >
                  Blog
                </Link>
                <Link 
                  to="/help" 
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-[#121E3C] rounded-lg text-sm font-medium transition-colors"
                >
                  Help & FAQs
                </Link>
                <Link 
                  to="/contact" 
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-[#121E3C] rounded-lg text-sm font-medium transition-colors"
                >
                  Contact Us
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default ComingSoonPage;
