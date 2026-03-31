import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import FinalCTA from '../components/FinalCTA';
import { 
  Shield, 
  Users, 
  TrendingUp, 
  Lightbulb, 
  Award, 
  CheckCircle,
  Eye,
  Target
} from 'lucide-react';
import { statsAPI } from '../api/services';

const AboutUsPage = () => {
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

  const coreValues = [
    {
      icon: Shield,
      title: "Trust & Transparency",
      description: "Every professional on our platform is verified. Every review is genuine. Every transaction is secure. We believe trust is earned through consistent transparency."
    },
    {
      icon: Users,
      title: "Accessibility", 
      description: "Quality services should be available to everyone, everywhere. We're breaking down barriers and making professional services accessible across Nigeria."
    },
    {
      icon: TrendingUp,
      title: "Empowerment",
      description: "We're not just connecting customers with services - we're helping skilled workers build sustainable businesses and achieve financial independence."
    },
    {
      icon: Lightbulb,
      title: "Innovation",
      description: "Technology should simplify lives. We continuously innovate to make finding and booking services as easy as a few taps on your phone."
    },
    {
      icon: Award,
      title: "Excellence",
      description: "We're committed to delivering exceptional experiences. From our platform design to customer support, excellence is our standard."
    },
    {
      icon: CheckCircle,
      title: "Accountability",
      description: "Fair treatment for all users. Clear policies. Reliable support. We hold ourselves and our community to the highest standards."
    }
  ];

  const stats = [
    { number: platformStats?.total_tradespeople || "5,000", suffix: "+", label: "Tradespeople" },
    { number: platformStats?.total_categories || "28", suffix: "+", label: "Service Categories" },
    { number: platformStats?.total_states ?? "0", suffix: "", label: "Nigerian States" },
    { number: platformStats?.total_jobs_completed ?? platformStats?.total_jobs ?? "0", suffix: "+", label: "Jobs Completed" }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      {/* Hero Section */}
      <section className="relative pt-28 sm:pt-32 lg:pt-40 pb-24 lg:pb-32 overflow-hidden">
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
              Our Story
            </span>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold font-montserrat text-white mb-6 leading-tight">
              About ServiceHub
            </h1>
            <p className="text-lg text-white/70 font-lato leading-relaxed max-w-2xl mx-auto">
              Nigeria's trusted digital marketplace connecting you with verified service professionals
            </p>
          </div>
        </div>
      </section>

      {/* Our Story */}
      <section 
        className="relative py-20 lg:py-24 bg-white"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.97), rgba(255,255,255,0.97)), 
            linear-gradient(90deg, rgba(0,0,0,0.03) 1px, transparent 1px),
            linear-gradient(rgba(0,0,0,0.03) 1px, transparent 1px)`,
          backgroundSize: '100% 100%, 20px 20px, 20px 20px'
        }}
      >
        <div className="container mx-auto px-6 md:px-8 lg:px-12">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-2xl sm:text-3xl font-bold font-montserrat text-[#121E3C] mb-4">
                Our Story
              </h2>
              <p className="text-gray-600 font-lato max-w-2xl mx-auto">
                At ServiceHub, we believe finding trusted service professionals in Nigeria should be simple, safe, and stress-free.
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6 mb-12">
              {[
                'Plumbing & Water Works',
                'Electrical Repairs',
                'Carpentry & Furniture',
                'Building & Construction',
                'Home Cleaning',
                'Solar & Generator',
                'CCTV & Security',
                'And many more...'
              ].map((service, idx) => (
                <div key={idx} className="flex items-center gap-3 p-3 bg-gray-50/80 rounded-lg">
                  <div className="w-2 h-2 bg-[#34D164] rounded-full shrink-0" />
                  <span className="text-gray-700 font-lato text-sm">{service}</span>
                </div>
              ))}
            </div>

            <div className="bg-[#121E3C]/5 backdrop-blur-sm border border-[#121E3C]/10 p-8 rounded-2xl text-center">
              <blockquote className="text-gray-700 font-lato italic text-lg leading-relaxed mb-4">
                "We're building a community where trust, quality, and opportunity come together to transform Nigeria's service industry."
              </blockquote>
              <footer className="text-gray-500 font-lato text-sm">
                — The ServiceHub Team
              </footer>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
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
          <div className="max-w-5xl mx-auto">
            <h2 className="text-xl sm:text-2xl font-semibold font-montserrat text-center text-white/90 mb-10">
              ServiceHub by the Numbers
            </h2>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 lg:gap-8">
              {stats.map((stat, index) => (
                <div key={index} className="text-center p-4">
                  <div className="text-3xl md:text-4xl font-bold font-montserrat text-[#34D164] mb-2">
                    {stat.number}{stat.suffix}
                  </div>
                  <div className="text-white/60 font-lato text-sm">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section 
        className="relative py-20 lg:py-24 bg-white"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.97), rgba(255,255,255,0.97)), 
            linear-gradient(90deg, rgba(0,0,0,0.03) 1px, transparent 1px),
            linear-gradient(rgba(0,0,0,0.03) 1px, transparent 1px)`,
          backgroundSize: '100% 100%, 20px 20px, 20px 20px'
        }}
      >
        <div className="container mx-auto px-6 md:px-8 lg:px-12">
          <div className="max-w-5xl mx-auto">
            <div className="grid md:grid-cols-2 gap-8">
              {/* Mission */}
              <div className="bg-white/80 backdrop-blur-sm border border-gray-100 rounded-2xl p-8 shadow-sm hover:shadow-md transition-shadow duration-300">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-[#34D164]/10 rounded-xl flex items-center justify-center">
                    <Target size={24} className="text-[#34D164]" />
                  </div>
                  <h3 className="text-xl font-semibold font-montserrat text-[#121E3C]">
                    Our Mission
                  </h3>
                </div>
                
                <p className="text-gray-600 font-lato mb-6 leading-relaxed">
                  Empower Nigerians with easy access to trusted service professionals while helping skilled workers grow sustainable businesses.
                </p>
                
                <div className="space-y-3">
                  {['Technology', 'Transparency', 'Opportunity'].map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <div className="w-1.5 h-1.5 bg-[#34D164] rounded-full" />
                      <span className="text-gray-700 font-lato text-sm">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Vision */}
              <div className="bg-white/80 backdrop-blur-sm border border-gray-100 rounded-2xl p-8 shadow-sm hover:shadow-md transition-shadow duration-300">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-[#34D164]/10 rounded-xl flex items-center justify-center">
                    <Eye size={24} className="text-[#34D164]" />
                  </div>
                  <h3 className="text-xl font-semibold font-montserrat text-[#121E3C]">
                    Our Vision
                  </h3>
                </div>
                
                <p className="text-gray-600 font-lato mb-6 leading-relaxed">
                  Become Nigeria's most trusted digital marketplace for professional services.
                </p>
                
                <div className="space-y-3">
                  {[
                    { title: 'Quality', desc: 'Verified professionals only' },
                    { title: 'Accountability', desc: 'Transparent reviews' },
                    { title: 'Convenience', desc: 'Easy booking & support' }
                  ].map((item, idx) => (
                    <div key={idx} className="bg-gray-50 p-3 rounded-lg">
                      <div className="text-[#121E3C] font-medium font-montserrat text-sm">{item.title}</div>
                      <div className="text-gray-500 font-lato text-xs mt-0.5">{item.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Core Values */}
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
                Our Core Values
              </h2>
              <p className="text-white/60 font-lato">
                The principles that guide everything we do
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {coreValues.map((value, index) => (
                <div 
                  key={index} 
                  className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all duration-300"
                >
                  <div className="w-12 h-12 bg-[#34D164]/20 rounded-xl flex items-center justify-center mb-5">
                    <value.icon size={24} className="text-[#34D164]" />
                  </div>
                  
                  <h3 className="text-lg font-semibold font-montserrat text-white mb-3">
                    {value.title}
                  </h3>
                  
                  <p className="text-white/60 font-lato text-sm leading-relaxed">
                    {value.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <FinalCTA 
        badge="Join us"
        title="Ready to experience the ServiceHub difference?"
        subtitle="Connect with verified professionals or grow your business today."
        buttonText="Get started"
        showAuthModal={true}
      />

      <Footer />
    </div>
  );
};

export default AboutUsPage;
