import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import FinalCTA from '../components/FinalCTA';
import TradespersonRegistration from '../components/auth/TradespersonRegistration';
import { Button } from '../components/ui/button';
import { CheckCircle, Users, Star, TrendingUp, Zap, DollarSign, ArrowRight, Briefcase, Shield, Award } from 'lucide-react';
import { statsAPI } from '../api/services';

const HERO_BG_IMAGE = '/stock/bg4.jpg';

const JoinForFreePage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [showRegistration, setShowRegistration] = useState(false);
  const [platformStats, setPlatformStats] = useState(null);
  const [referralCode, setReferralCode] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const ref = params.get('ref');
    if (ref) {
      setReferralCode(ref);
      setShowRegistration(true);
    }
  }, [location.search]);

  useEffect(() => {
    let mounted = true;
    const fetchStats = async () => {
      try {
        const stats = await statsAPI.getStats();
        if (mounted) setPlatformStats(stats);
      } catch (e) {}
    };
    fetchStats();
    const intervalId = setInterval(fetchStats, 60000);
    return () => {
      mounted = false;
      clearInterval(intervalId);
    };
  }, []);

  const openLoginModalFromRegistration = () => {
    setShowRegistration(false);
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('open-auth-modal', { detail: { mode: 'login' } }));
    }, 0);
  };

  const benefits = [
    {
      icon: DollarSign,
      title: "Earn More",
      stat: "₦2.5M+",
      description: "Average annual earnings for verified tradespeople"
    },
    {
      icon: TrendingUp,
      title: "Grow Fast",
      stat: "72%",
      description: "Increase in bookings within first 3 months"
    },
    {
      icon: Users,
      title: "More Clients",
      stat: "100+",
      description: "Active homeowners searching daily"
    },
    {
      icon: Star,
      title: "Build Trust",
      stat: "4.8★",
      description: "Average platform rating from customers"
    },
    {
      icon: Zap,
      title: "Instant Leads",
      stat: "24/7",
      description: "Get notified immediately for matching jobs"
    },
    {
      icon: Shield,
      title: "Verified Jobs",
      stat: "100%",
      description: "All jobs and homeowners are verified"
    }
  ];

  const steps = [
    {
      number: "01",
      title: "Create Your Profile",
      description: "Fill out your professional details, upload your ID, and showcase your best work",
      icon: Briefcase
    },
    {
      number: "02", 
      title: "Get Verified",
      description: "Complete our quick skills assessment to earn your verified badge",
      icon: Shield
    },
    {
      number: "03",
      title: "Start Earning",
      description: "Receive job matches and start building your client base immediately",
      icon: Award
    }
  ];

  const testimonials = [
    {
      name: "Adebayo Okonkwo",
      trade: "Electrician",
      location: "Lagos",
      rating: 4.9,
      review: "ServiceHub has transformed my business. I now get 5-8 jobs per week and my income has doubled.",
      earnings: "₦380,000/month",
      image: "/stock/tradesperson1.jpg"
    },
    {
      name: "Fatima Hassan",
      trade: "Painter & Decorator",
      location: "Abuja",
      rating: 4.8,
      review: "Best decision I made was joining ServiceHub. The lead quality is excellent and I can work on my own terms.",
      earnings: "₦290,000/month",
      image: "/stock/tradesperson2.jpg"
    },
    {
      name: "Chidi Okwu",
      trade: "Plumber",
      location: "Port Harcourt",
      rating: 5.0,
      review: "ServiceHub helped me grow from doing 2-3 jobs per month to 15+ jobs. Customers trust the platform.",
      earnings: "₦420,000/month",
      image: "/stock/tradesperson3.jpg"
    }
  ];

  return (
    <div className="min-h-screen bg-[#0a1628]">
      <Header />
      
      {/* Hero Section - Full screen with background image */}
      <section className="relative min-h-[100vh] flex flex-col pt-14">
        <div className="absolute inset-0 z-0 overflow-hidden">
          <img
            src={HERO_BG_IMAGE}
            alt=""
            className="w-full h-full object-cover"
            loading="eager"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a1628] via-black/60 to-black/40" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-transparent" />
        </div>

        <div className="relative z-10 flex-1 flex flex-col justify-center">
          <div className="container mx-auto px-6 md:px-8 lg:px-12 py-20">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 bg-[#34D164]/20 text-[#34D164] px-4 py-2 rounded-full mb-6 backdrop-blur-sm border border-[#34D164]/30">
                <Zap size={16} />
                <span className="text-sm font-semibold font-lato">Join Nigeria's #1 Platform for Tradespeople</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold font-montserrat text-white mb-6 leading-[1.1] tracking-tight">
                Turn Your <span className="text-[#34D164]">Skills</span> Into a{' '}
                <span className="text-[#34D164]">Thriving Business</span>
              </h1>

              <p className="text-lg sm:text-xl text-white/70 font-lato mb-8 leading-relaxed max-w-2xl">
                Connect with homeowners across Nigeria. Get verified, receive job matches, 
                and start earning more. Registration is completely free.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <Button
                  onClick={() => setShowRegistration(true)}
                  className="bg-[#34D164] hover:bg-[#2db856] text-white px-8 py-4 text-lg font-semibold font-lato rounded-xl flex items-center justify-center gap-2 transition-all duration-200 shadow-lg shadow-[#34D164]/20"
                >
                  Start Free Registration
                  <ArrowRight size={20} />
                </Button>
                <Button
                  onClick={() => navigate('/how-it-works')}
                  className="bg-white/10 hover:bg-white/20 text-white border border-white/20 px-8 py-4 text-lg font-semibold font-lato rounded-xl backdrop-blur-sm transition-all duration-200"
                >
                  Learn How It Works
                </Button>
              </div>

              <div className="flex flex-wrap items-center gap-6 text-white/60 font-lato text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-[#34D164]" />
                  <span>100% Free to join</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-[#34D164]" />
                  <span>No subscription fees</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-[#34D164]" />
                  <span>Setup in 10 minutes</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="relative z-10 bg-white/5 backdrop-blur-md border-t border-white/10">
          <div className="container mx-auto px-6 md:px-8 lg:px-12 py-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-white font-montserrat">
                  {Number(platformStats?.total_homeowners || 5000).toLocaleString()}+
                </div>
                <div className="text-white/60 text-sm font-lato mt-1">Homeowners</div>
              </div>
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-white font-montserrat">
                  {Number(platformStats?.total_categories || 28)}+
                </div>
                <div className="text-white/60 text-sm font-lato mt-1">Trade Categories</div>
              </div>
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-[#34D164] font-montserrat">₦2.5M</div>
                <div className="text-white/60 text-sm font-lato mt-1">Avg. Annual Income</div>
              </div>
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-white font-montserrat">4.8★</div>
                <div className="text-white/60 text-sm font-lato mt-1">Platform Rating</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="relative py-20 bg-white overflow-hidden">
        {/* Subtle grid background */}
        <div 
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(#121E3C 1px, transparent 1px), linear-gradient(90deg, #121E3C 1px, transparent 1px)`,
            backgroundSize: '80px 80px'
          }}
        />
        <div className="container relative z-10 mx-auto px-6 md:px-8 lg:px-12">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-[#121E3C] font-montserrat mb-4">
              Why <span className="text-[#34D164]">Tradespeople</span> Choose ServiceHub
            </h2>
            <p className="text-lg text-gray-600 font-lato max-w-2xl mx-auto">
              Join thousands of successful tradespeople who have transformed their business
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {benefits.map((benefit, index) => (
              <div 
                key={index} 
                className="bg-[#FAFAFA] border border-gray-100 rounded-2xl p-6 hover:shadow-lg hover:border-[#34D164]/30 transition-all duration-300 group"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-[#34D164]/10 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-[#34D164]/20 transition-colors">
                    <benefit.icon className="w-6 h-6 text-[#34D164]" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-[#34D164] font-montserrat mb-1">{benefit.stat}</div>
                    <h3 className="text-lg font-semibold text-[#121E3C] font-montserrat mb-2">{benefit.title}</h3>
                    <p className="text-gray-600 font-lato text-sm">{benefit.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-[#0a1628]">
        <div className="container mx-auto px-6 md:px-8 lg:px-12">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white font-montserrat mb-4">
              Get Started in <span className="text-[#34D164]">3 Simple Steps</span>
            </h2>
            <p className="text-lg text-white/60 font-lato">
              From signup to first job in under 24 hours
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {steps.map((step, index) => (
              <div key={index} className="relative">
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-16 left-[60%] w-[80%] h-[2px] bg-gradient-to-r from-[#34D164]/50 to-transparent" />
                )}
                <div className="text-center">
                  <div className="relative inline-block mb-6">
                    <div className="w-20 h-20 bg-gradient-to-br from-[#34D164] to-[#2db856] rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-[#34D164]/20">
                      <step.icon className="w-8 h-8 text-white" />
                    </div>
                    <div className="absolute -top-2 -right-2 w-8 h-8 bg-[#0a1628] border-2 border-[#34D164] rounded-full flex items-center justify-center">
                      <span className="text-xs font-bold text-[#34D164] font-montserrat">{step.number}</span>
                    </div>
                  </div>
                  <h3 className="text-xl font-semibold text-white font-montserrat mb-3">{step.title}</h3>
                  <p className="text-white/60 font-lato text-sm leading-relaxed">{step.description}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <Button
              onClick={() => setShowRegistration(true)}
              className="bg-[#34D164] hover:bg-[#2db856] text-white px-10 py-4 text-lg font-semibold font-lato rounded-xl flex items-center justify-center gap-2 mx-auto transition-all duration-200 shadow-lg shadow-[#34D164]/20"
            >
              Get Started Now - It's Free
              <ArrowRight size={20} />
            </Button>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="relative py-20 bg-white overflow-hidden">
        {/* Subtle grid background */}
        <div 
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(#121E3C 1px, transparent 1px), linear-gradient(90deg, #121E3C 1px, transparent 1px)`,
            backgroundSize: '80px 80px'
          }}
        />
        <div className="container relative z-10 mx-auto px-6 md:px-8 lg:px-12">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-[#121E3C] font-montserrat mb-4">
              <span className="text-[#34D164]">Success Stories</span> From Real Tradespeople
            </h2>
            <p className="text-lg text-gray-600 font-lato">
              Hear from tradespeople who have transformed their business with ServiceHub
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {testimonials.map((testimonial, index) => (
              <div 
                key={index} 
                className="bg-[#FAFAFA] border border-gray-100 rounded-2xl p-6 hover:shadow-lg hover:border-[#34D164]/30 transition-all duration-300"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-[#34D164] to-[#2db856] rounded-full flex items-center justify-center text-white font-bold text-lg font-montserrat">
                    {testimonial.name.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-[#121E3C] font-montserrat">{testimonial.name}</h4>
                    <p className="text-sm text-gray-500 font-lato">{testimonial.trade} • {testimonial.location}</p>
                  </div>
                  <div className="flex items-center gap-1 bg-yellow-100 px-2 py-1 rounded-full">
                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                    <span className="text-sm font-semibold text-yellow-600">{testimonial.rating}</span>
                  </div>
                </div>
                
                <p className="text-gray-700 font-lato text-sm leading-relaxed mb-4 italic">
                  "{testimonial.review}"
                </p>
                
                <div className="bg-[#34D164]/10 text-[#34D164] px-4 py-2 rounded-lg text-sm font-semibold font-lato inline-block">
                  Earning: {testimonial.earnings}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <FinalCTA 
        badge="Join for free"
        title="Ready to transform your business?"
        subtitle="Join over 5,000+ tradespeople already earning more with ServiceHub. Registration takes less than 10 minutes."
        buttonText="Get started today"
        showAuthModal={false}
        buttonLink="/join-for-free?ref=cta"
      />

      {/* Registration Modal */}
      {showRegistration && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 font-montserrat">Join ServiceHub</h3>
                  <p className="text-gray-600 font-lato text-sm">Free registration for tradespeople</p>
                </div>
                <button
                  onClick={() => setShowRegistration(false)}
                  className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-700 transition-colors"
                >
                  ×
                </button>
              </div>
              <TradespersonRegistration
                referralCode={referralCode}
                onClose={() => setShowRegistration(false)}
                onSwitchToLogin={openLoginModalFromRegistration}
              />
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default JoinForFreePage;
