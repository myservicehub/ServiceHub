import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import FinalCTA from '../components/FinalCTA';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { 
  Users, 
  FileText, 
  Heart, 
  Phone, 
  Star,
  Shield,
  Search,
  UserCheck,
  MessageCircle,
  CheckCircle,
  Coins,
  MapPin,
  Award,
  Zap
} from 'lucide-react';
import { statsAPI } from '../api/services';

const HowItWorksPage = () => {
  const [activeTab, setActiveTab] = useState('homeowner');
  const { isTradesperson, isAuthenticated } = useAuth();
  const [platformStats, setPlatformStats] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await statsAPI.getStats();
        setPlatformStats(data);
      } catch (err) {
        console.error('Failed to fetch stats:', err);
      }
    };
    fetchStats();
  }, []);

  // Ensure page loads from the very top when navigated to
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      } catch {
        window.scrollTo(0, 0);
      }
    }
  }, []);

  const homeownerSteps = [
    {
      step: 1,
      icon: FileText,
      title: "Post Your Job",
      description: "Describe your project with details, location, timeline, and budget. It's free to post!",
      details: [
        `Choose from ${platformStats?.total_categories || 28}+ service categories`,
        "Set your location and timeline", 
        "Add photos if helpful",
        "Specify your budget range"
      ]
    },
    {
      step: 2,
      icon: Heart,
      title: "Receive Interest",
      description: "Verified tradespeople show interest in your job.",
      details: [
        "Only serious professionals apply",
        "View their profiles and ratings",
        "See their experience and past work",
        "Check their location and availability"
      ]
    },
    {
      step: 3,
      icon: Phone,
      title: "Share Contact Details",
      description: "Choose which tradespeople to share your contact details with. You're in control!",
      details: [
        "Review interested professionals",
        "Check ratings and reviews",
        "Share details with your top choices",
        "Get quotes and discuss your project"
      ]
    },
    {
      step: 4,
      icon: CheckCircle,
      title: "Get Work Done",
      description: "Work directly with your chosen tradesperson to complete your project successfully.",
      details: [
        "Communicate directly with professionals",
        "Agree on final pricing and timeline",
        "Monitor progress and quality",
        "Pay directly to the tradesperson"
      ]
    },
    {
      step: 5,
      icon: Star,
      title: "Leave a Review",
      description: "Rate your experience to help other homeowners and build the tradesperson's reputation.",
      details: [
        "Rate the quality of work (1-5 stars)",
        "Comment on professionalism",
        "Help others make informed choices",
        "Build trust in the community"
      ]
    }
  ];

  const tradespersonSteps = [
    {
      step: 1,
      icon: UserCheck,
      title: "Sign Up & Get Verified",
      description: "Create your profile with skills, experience, and get verified for trust and credibility.",
      details: [
        "Complete your professional profile",
        "Upload portfolio and certifications",
        "Verify your identity documents",
        "Set your service areas and travel distance"
      ]
    },
    {
      step: 2,
      icon: Search,
      title: "Browse Available Jobs",
      description: "Find jobs that match your skills in your area using our smart job matching system.",
      details: [
        "Filter by location and distance",
        "Search by your trade categories",
        "View job details and budgets",
        "See timeline and requirements"
      ]
    },
    {
      step: 3,
      icon: Heart,
      title: "Show Interest",
      description: "Express serious interest in jobs that match your skills.",
      details: [
        "Apply for jobs that match your expertise",
        "Show commitment to quality work",
        "Professional application process",
        "Increases your chances of being selected"
      ]
    },
    {
      step: 4,
      icon: Phone,
      title: "Get Contact Details",
      description: "When homeowners choose you, receive their contact information to discuss the project.",
      details: [
        "Direct contact with homeowners",
        "Discuss project requirements",
        "Provide detailed quotes",
        "Schedule site visits"
      ]
    },
    {
      step: 5,
      icon: Award,
      title: "Complete Work & Build Reputation",
      description: "Deliver quality work, earn great reviews, and grow your business on ServiceHub.",
      details: [
        "Complete projects professionally",
        "Earn positive reviews and ratings",
        "Build your reputation score",
        "Get more job opportunities"
      ]
    }
  ];

  const platformFeatures = [
    {
      icon: Shield,
      title: "Verified Professionals",
      description: "All tradespeople undergo identity verification and skill assessment"
    },
    {
      icon: CheckCircle,
      title: "Quality Connections",
      description: "Professional matching system ensures serious inquiries and quality connections"
    },
    {
      icon: MapPin,
      title: "Location-Based Matching",
      description: "Google Maps integration for precise location matching and distance calculation"
    },
    {
      icon: Star,
      title: "Review & Rating System",
      description: "Transparent feedback system builds trust and helps you make informed decisions"
    },
    {
      icon: Users,
      title: "Referral Program",
      description: "Earn rewards by referring friends and family to join the ServiceHub community"
    },
    {
      icon: Zap,
      title: "Instant Notifications",
      description: "Real-time email and SMS notifications keep you updated on all activity"
    }
  ];

  const stats = [
    { number: `${Number(platformStats?.total_categories ?? 0) || 0}+`, label: "Service Categories" },
    { number: Number(platformStats?.total_states ?? 0) || 0, label: "Nigerian States" },
    { number: platformStats?.total_tradespeople ? Number(platformStats.total_tradespeople).toLocaleString() + "+" : "0+", label: "Active Tradespeople" },
    { number: "5-200km", label: "Service Radius" }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      {/* Hero Section */}
      <section className="relative pt-28 sm:pt-32 lg:pt-40 pb-20 lg:pb-28 overflow-hidden">
        <div className="absolute inset-0">
          <img 
            src="/stock/bg9.jpg" 
            alt="" 
            className="w-full h-full object-cover"
            loading="eager"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#121E3C]/80 via-[#121E3C]/70 to-[#121E3C]/80" />
        </div>
        
        <div className="container relative z-10 mx-auto px-6 md:px-8 lg:px-12">
          <div className="max-w-3xl mx-auto text-center">
            <span className="inline-block px-4 py-1.5 mb-6 text-xs font-semibold font-lato tracking-wider uppercase text-[#34D164] bg-white/5 backdrop-blur-sm border border-white/10 rounded-full">
              Simple Process
            </span>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold font-montserrat text-white mb-5 leading-tight">
              How ServiceHub Works
            </h1>
            <p className="text-lg text-white/70 font-lato mb-10 max-w-2xl mx-auto">
              Connecting Nigerian homeowners with trusted professionals in 5 simple steps
            </p>
            
            {/* Tab Selector */}
            <div className="inline-flex bg-white/10 backdrop-blur-sm rounded-full p-1 border border-white/10">
              <button
                onClick={() => setActiveTab('homeowner')}
                className={`px-6 py-2.5 rounded-full font-lato font-medium text-sm transition-all ${
                  activeTab === 'homeowner'
                    ? 'bg-[#34D164] text-white shadow-lg'
                    : 'text-white/70 hover:text-white'
                }`}
              >
                For Homeowners
              </button>
              <button
                onClick={() => setActiveTab('tradesperson')}
                className={`px-6 py-2.5 rounded-full font-lato font-medium text-sm transition-all ${
                  activeTab === 'tradesperson'
                    ? 'bg-[#34D164] text-white shadow-lg'
                    : 'text-white/70 hover:text-white'
                }`}
              >
                For Tradespeople
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Steps Section */}
      <section 
        className="relative py-20 lg:py-24 bg-white"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.97), rgba(255,255,255,0.97)), 
            linear-gradient(90deg, rgba(52,209,100,0.08) 1px, transparent 1px),
            linear-gradient(rgba(52,209,100,0.08) 1px, transparent 1px)`,
          backgroundSize: '100% 100%, 20px 20px, 20px 20px'
        }}
      >
        <div className="container relative z-10 mx-auto px-6 md:px-8 lg:px-12">
          <div className="max-w-6xl mx-auto">
            {/* Section Header */}
            <div className="text-center mb-14">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold font-montserrat text-[#121E3C] mb-4">
                {activeTab === 'homeowner' ? 'How It Works for Homeowners' : 'How It Works for Tradespeople'}
              </h2>
              <p className="text-lg text-gray-500 font-lato max-w-xl mx-auto">
                {activeTab === 'homeowner' 
                  ? 'Find trusted professionals in 5 simple steps'
                  : 'Grow your business with ServiceHub'}
              </p>
            </div>

            {/* Step Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {(activeTab === 'homeowner' ? homeownerSteps : tradespersonSteps).map((stepData, index) => (
                <div
                  key={index}
                  className="group"
                >
                  {/* Card with subtle shadow */}
                  <div className="relative h-full p-6 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-md hover:border-[#34D164]/20 transition-all duration-300">
                    {/* Top row: Icon + Step Number */}
                    <div className="flex items-start justify-between mb-5">
                      {/* Icon */}
                      <div className="w-12 h-12 rounded-xl bg-[#34D164]/10 border border-[#34D164]/20 flex items-center justify-center group-hover:bg-[#34D164]/15 transition-all duration-300">
                        <stepData.icon className="w-6 h-6 text-[#34D164]" />
                      </div>
                      
                      {/* Step Number Badge */}
                      <div className="w-9 h-9 rounded-full bg-[#121E3C] flex items-center justify-center">
                        <span className="text-sm font-bold font-montserrat text-white">{stepData.step}</span>
                      </div>
                    </div>

                    {/* Title */}
                    <h3 className="text-lg font-semibold font-montserrat text-[#121E3C] mb-2 group-hover:text-[#34D164] transition-colors duration-300">
                      {stepData.title}
                    </h3>

                    {/* Description */}
                    <p className="text-gray-500 font-lato text-sm leading-relaxed mb-4">
                      {stepData.description}
                    </p>

                    {/* Bottom: Details after horizontal line */}
                    <div className="pt-4 border-t border-gray-100">
                      <div className="space-y-2">
                        {stepData.details.slice(0, 3).map((detail, detailIndex) => (
                          <div key={detailIndex} className="flex items-start gap-2">
                            <div className="w-1 h-1 bg-[#34D164] rounded-full mt-1.5 shrink-0" />
                            <span className="text-sm font-lato text-gray-500">{detail}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Platform Features */}
      <section className="relative py-20 lg:py-24 overflow-hidden">
        <div className="absolute inset-0">
          <img 
            src="/stock/bg4.jpg" 
            alt="" 
            className="w-full h-full object-cover"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-[#121E3C]/90" />
        </div>
        
        <div className="container relative z-10 mx-auto px-6 md:px-8 lg:px-12">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-2xl sm:text-3xl font-semibold font-montserrat text-white mb-3">
                Why Choose ServiceHub?
              </h2>
              <p className="text-white/60 font-lato">
                Features that make finding professionals easy and safe
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {platformFeatures.map((feature, index) => (
                <div 
                  key={index} 
                  className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all duration-300"
                >
                  <div className="w-12 h-12 bg-[#34D164]/20 rounded-xl flex items-center justify-center mb-4">
                    <feature.icon size={24} className="text-[#34D164]" />
                  </div>
                  <h3 className="text-lg font-semibold font-montserrat text-white mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-white/60 font-lato text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Statistics */}
      <section 
        className="relative py-16 lg:py-20 bg-white"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.97), rgba(255,255,255,0.97)), 
            linear-gradient(90deg, rgba(0,0,0,0.03) 1px, transparent 1px),
            linear-gradient(rgba(0,0,0,0.03) 1px, transparent 1px)`,
          backgroundSize: '100% 100%, 20px 20px, 20px 20px'
        }}
      >
        <div className="container mx-auto px-6 md:px-8 lg:px-12">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-xl sm:text-2xl font-semibold font-montserrat text-center text-[#121E3C] mb-10">
              ServiceHub by the Numbers
            </h2>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 lg:gap-8">
              {stats.map((stat, index) => (
                <div key={index} className="text-center p-4 bg-white/80 backdrop-blur-sm border border-gray-100 rounded-xl">
                  <div className="text-2xl md:text-3xl font-bold font-montserrat text-[#34D164] mb-1">
                    {stat.number}
                  </div>
                  <div className="text-gray-500 font-lato text-sm">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* How The Coin System Works - Only visible to tradespeople */}
      {isTradesperson() && (
        <section className="relative py-16 lg:py-20 overflow-hidden">
          <div className="absolute inset-0">
            <img 
              src="/stock/bg15.jpg" 
              alt="" 
              className="w-full h-full object-cover object-top"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-black/70" />
          </div>
          
          <div className="container relative z-10 mx-auto px-6 md:px-8 lg:px-12">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-10">
                <h2 className="text-xl sm:text-2xl font-semibold font-montserrat text-white mb-2">
                  Understanding Our Coin System
                </h2>
                <p className="text-white/60 font-lato text-sm">
                  Fair and transparent pricing for quality connections
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 bg-yellow-500/20 rounded-xl flex items-center justify-center">
                      <Coins size={20} className="text-yellow-400" />
                    </div>
                    <h3 className="text-lg font-semibold font-montserrat text-white">
                      For Tradespeople
                    </h3>
                  </div>
                  
                  <div className="space-y-3">
                    {[
                      { title: 'Fund Your Wallet', desc: 'Add coins via bank transfer' },
                      { title: 'Show Interest (15 coins)', desc: 'Pay for jobs you\'re serious about' },
                      { title: 'Earn Through Referrals', desc: 'Get coins for verified referrals' }
                    ].map((item, idx) => (
                      <div key={idx} className="flex items-start gap-3">
                        <div className="w-1.5 h-1.5 bg-[#34D164] rounded-full mt-2 shrink-0" />
                        <div>
                          <span className="text-white text-sm font-medium">{item.title}</span>
                          <p className="text-white/50 text-xs">{item.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
                      <Users size={20} className="text-blue-400" />
                    </div>
                    <h3 className="text-lg font-semibold font-montserrat text-white">
                      For Homeowners
                    </h3>
                  </div>
                  
                  <div className="space-y-3">
                    {[
                      { title: 'Free Job Posting', desc: 'Post unlimited jobs at no cost' },
                      { title: 'Quality Applications', desc: 'Only serious professionals apply' },
                      { title: 'You Choose', desc: 'Control who gets your details' }
                    ].map((item, idx) => (
                      <div key={idx} className="flex items-start gap-3">
                        <div className="w-1.5 h-1.5 bg-[#34D164] rounded-full mt-2 shrink-0" />
                        <div>
                          <span className="text-white text-sm font-medium">{item.title}</span>
                          <p className="text-white/50 text-xs">{item.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Safety & Trust */}
      <section 
        className="relative py-16 lg:py-20 bg-white"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.97), rgba(255,255,255,0.97)), 
            linear-gradient(90deg, rgba(0,0,0,0.03) 1px, transparent 1px),
            linear-gradient(rgba(0,0,0,0.03) 1px, transparent 1px)`,
          backgroundSize: '100% 100%, 20px 20px, 20px 20px'
        }}
      >
        <div className="container mx-auto px-6 md:px-8 lg:px-12">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-xl sm:text-2xl font-semibold font-montserrat text-[#121E3C] mb-2">
                Your Safety & Trust Matter
              </h2>
            </div>
            
            <div className="grid md:grid-cols-3 gap-6">
              {[
                { icon: UserCheck, title: 'ID Verification', desc: 'All professionals verify with Nigerian ID' },
                { icon: Star, title: 'Honest Reviews', desc: 'Only verified jobs can leave reviews' },
                { icon: MessageCircle, title: '24/7 Support', desc: 'Our team helps resolve any issues' }
              ].map((item, idx) => (
                <div key={idx} className="text-center bg-white/80 backdrop-blur-sm border border-gray-100 rounded-xl p-6">
                  <div className="w-12 h-12 bg-[#34D164]/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <item.icon size={24} className="text-[#34D164]" />
                  </div>
                  <h3 className="font-semibold font-montserrat text-[#121E3C] mb-2">{item.title}</h3>
                  <p className="text-sm text-gray-500 font-lato">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <FinalCTA 
        badge="Start now"
        title="Ready to get started?"
        subtitle="Post a job to find professionals or join as a tradesperson to find work."
        buttonText="Post a job"
        buttonLink="/post-job"
        showAuthModal={false}
      />

      <Footer />
    </div>
  );
};

export default HowItWorksPage;
