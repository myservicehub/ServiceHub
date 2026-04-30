import React, { useState, useEffect } from 'react';
import { useSEO } from '../hooks/useSEO';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { statsAPI } from '../api/services';
import { 
  Handshake, 
  Building, 
  Users, 
  TrendingUp, 
  Award,
  Globe,
  Zap,
  Shield,
  Star,
  CheckCircle,
  ArrowRight,
  Mail,
  Phone,
  MapPin,
  Target,
  DollarSign,
  Briefcase,
  Network,
  Lightbulb,
  Heart,
  Truck,
  CreditCard,
  GraduationCap,
  Settings
} from 'lucide-react';

const PartnershipPage = () => {
  useSEO({
    title: 'Partnerships',
    description: 'Partner with ServiceHub to grow your network across Nigeria\'s home services industry. Explore opportunities for trade organisations and businesses.',
    canonical: '/partnerships',
  });
  const [selectedPartnership, setSelectedPartnership] = useState('trade-organizations');
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

  const partnershipTypes = [
    {
      id: 'trade-organizations',
      icon: Users,
      title: 'Trade Organizations & Associations',
      description: 'Partner with professional trade bodies to connect verified members with opportunities',
      benefits: [
        'Direct access to verified, skilled professionals',
        'Bulk member onboarding and verification',
        'Exclusive partnership badges and recognition',
        'Training and certification program integration',
        'Revenue sharing on member activities'
      ],
      examples: [
        'Nigerian Institute of Building (NIOB)',
        'Nigerian Society of Engineers (NSE)',
        'Master Craftsmen Associations',
        'State Artisan Cooperatives'
      ]
    },
    {
      id: 'suppliers',
      icon: Truck,
      title: 'Suppliers & Material Vendors',
      description: 'Connect with tradespeople through integrated procurement and supply chain solutions',
      benefits: [
        'Direct sales channel to active tradespeople',
        'Integrated ordering and delivery system',
        'Marketing exposure to thousands of professionals',
        'Data insights on material demand and trends',
        'Bulk order management and logistics support'
      ],
      examples: [
        'Building material suppliers',
        'Tool and equipment vendors',
        'Electrical and plumbing wholesalers',
        'Paint and finishing suppliers'
      ]
    },
    {
      id: 'financial',
      icon: CreditCard,
      title: 'Financial Institutions',
      description: 'Provide financial services and solutions to our growing community of professionals',
      benefits: [
        'Access to verified business owners and contractors',
        'Integration with wallet and payment systems',
        'Loan and credit product distribution',
        'Financial literacy program partnerships',
        'Data-driven risk assessment capabilities'
      ],
      examples: [
        'Commercial banks (First Bank, GTBank, Zenith)',
        'Microfinance institutions',
        'Insurance companies',
        'Equipment financing companies'
      ]
    },
    {
      id: 'technology',
      icon: Settings,
      title: 'Technology Partners',
      description: 'Integrate with technology solutions that enhance our platform capabilities',
      benefits: [
        'API integration and co-development opportunities',
        'White-label solution partnerships',
        'Technical expertise exchange',
        'Joint product development initiatives',
        'Market expansion collaboration'
      ],
      examples: [
        'Payment gateway providers',
        'SMS and communication platforms',
        'Project management tools',
        'Accounting software providers'
      ]
    },
    {
      id: 'training',
      icon: GraduationCap,
      title: 'Training & Education Providers',
      description: 'Offer skills development and certification programs to our professional community',
      benefits: [
        'Direct access to professionals seeking upskilling',
        'Integrated certification and badge system',
        'Course promotion to targeted audiences',
        'Performance tracking and outcome measurement',
        'Revenue sharing on successful completions'
      ],
      examples: [
        'Vocational training institutes',
        'Skills development centers',
        'Professional certification bodies',
        'Online learning platforms'
      ]
    },
    {
      id: 'corporate',
      icon: Building,
      title: 'Corporate & Enterprise Clients',
      description: 'Provide enterprise solutions for large-scale service procurement needs',
      benefits: [
        'Dedicated account management and support',
        'Custom integration and API access',
        'Volume discounts and enterprise pricing',
        'Priority access to top-rated professionals',
        'Comprehensive reporting and analytics'
      ],
      examples: [
        'Real estate developers',
        'Facility management companies',
        'Government agencies',
        'Multinational corporations'
      ]
    }
  ];

  const partnershipBenefits = [
    {
      icon: TrendingUp,
      title: 'Market Growth',
      description: 'Tap into Nigeria\'s rapidly growing digital services market with millions of potential customers'
    },
    {
      icon: Users,
      title: 'Large User Base',
      description: `Access to thousands of verified homeowners and skilled tradespeople across ${platformStats?.total_states ?? '0'} Nigerian states`
    },
    {
      icon: Shield,
      title: 'Trusted Platform',
      description: 'Partner with a verified, secure platform that prioritizes trust and quality in all transactions'
    },
    {
      icon: Zap,
      title: 'Innovation Focus',
      description: 'Collaborate on cutting-edge solutions including mobile apps, AI matching, and fintech integration'
    },
    {
      icon: Target,
      title: 'Targeted Reach',
      description: 'Precise targeting capabilities to reach specific demographics, skills, and geographic regions'
    },
    {
      icon: Award,
      title: 'Quality Assurance',
      description: 'All partners benefit from our rigorous verification processes and quality control measures'
    }
  ];

  const stats = [
    { number: platformStats?.total_states ?? '0', suffix: '+', label: 'Nigerian States Covered' },
    { number: platformStats?.total_categories || '28', suffix: '+', label: 'Service Categories' },
    { number: platformStats?.total_tradespeople || '1000', suffix: '+', label: 'Active Professionals' },
    { number: '95%', label: 'Customer Satisfaction' }
  ];

  const partnershipProcess = [
    {
      step: 1,
      title: 'Initial Discussion',
      description: 'Contact our partnerships team to discuss your goals and explore opportunities'
    },
    {
      step: 2,
      title: 'Proposal & Planning',
      description: 'We create a customized partnership proposal based on your specific needs and objectives'
    },
    {
      step: 3,
      title: 'Agreement & Integration',
      description: 'Finalize partnership terms and begin technical or operational integration process'
    },
    {
      step: 4,
      title: 'Launch & Support',
      description: 'Go live with dedicated support and ongoing partnership management'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      {/* Hero Section */}
      <section className="relative pt-24 sm:pt-28 lg:pt-32 pb-16 lg:pb-20 overflow-hidden">
        <div className="absolute inset-0">
          <img 
            src="/stock/bg8.jpg" 
            alt="" 
            className="w-full h-full object-cover"
            loading="eager"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#121E3C]/90 via-[#121E3C]/85 to-[#121E3C]/90" />
        </div>
        
        <div className="container relative z-10 mx-auto px-6 md:px-8 lg:px-12">
          <div className="max-w-3xl mx-auto text-center">
            <div className="w-14 h-14 bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <Handshake size={24} className="text-[#34D164]" />
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold font-montserrat text-white mb-4">
              Partner with ServiceHub
            </h1>
            <p className="text-white/70 font-lato text-sm mb-8 max-w-lg mx-auto">
              Join Nigeria's leading digital marketplace for professional services and unlock new growth opportunities
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button 
                onClick={() => document.getElementById('contact-form').scrollIntoView({ behavior: 'smooth' })}
                className="bg-[#34D164] hover:bg-[#2ab854] text-white px-6 py-2.5 text-sm font-medium rounded-full transition-all duration-300 hover:scale-105"
              >
                Become a Partner
              </Button>
              <Button 
                onClick={() => document.getElementById('partnership-types').scrollIntoView({ behavior: 'smooth' })}
                variant="outline"
                className="bg-white/10 backdrop-blur-sm border border-white/20 text-white px-6 py-2.5 text-sm font-medium rounded-full hover:bg-white/20 transition-all duration-300"
              >
                Explore Opportunities
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Statistics */}
      <section className="relative py-10 overflow-hidden">
        <div className="absolute inset-0 bg-[#121E3C]" />
        
        <div className="container relative z-10 mx-auto px-6 md:px-8 lg:px-12">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-base font-semibold font-montserrat text-white text-center mb-6">
              Growing Platform, Growing Opportunities
            </h2>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {stats.map((stat, index) => (
                <div key={index} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 text-center">
                  <div className="text-xl font-bold font-montserrat text-[#34D164] mb-1">
                    {stat.number}{stat.suffix}
                  </div>
                  <div className="text-white/60 text-xs font-lato">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Partnership Benefits */}
      <section 
        className="py-14 lg:py-16"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.97), rgba(255,255,255,0.97)), 
            linear-gradient(90deg, rgba(0,0,0,0.03) 1px, transparent 1px),
            linear-gradient(rgba(0,0,0,0.03) 1px, transparent 1px)`,
          backgroundSize: '100% 100%, 20px 20px, 20px 20px'
        }}
      >
        <div className="container mx-auto px-6 md:px-8 lg:px-12">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-xl sm:text-2xl font-semibold font-montserrat text-[#121E3C] mb-2">
                Why Partner with ServiceHub?
              </h2>
              <p className="text-gray-500 font-lato text-sm">
                Join a trusted platform that's transforming Nigeria's service industry
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {partnershipBenefits.map((benefit, index) => (
                <div key={index} className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg hover:border-[#34D164]/20 transition-all duration-300">
                  <div className="w-10 h-10 bg-[#34D164]/10 rounded-xl flex items-center justify-center mb-4">
                    <benefit.icon size={18} className="text-[#34D164]" />
                  </div>
                  <h3 className="text-base font-semibold font-montserrat text-[#121E3C] mb-2">
                    {benefit.title}
                  </h3>
                  <p className="text-gray-500 font-lato text-xs leading-relaxed">
                    {benefit.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Partnership Types */}
      <section id="partnership-types" className="relative py-14 lg:py-16 overflow-hidden">
        <div className="absolute inset-0">
          <img 
            src="/stock/bg15.jpg" 
            alt="" 
            className="w-full h-full object-cover object-top"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-[#121E3C]/90" />
        </div>
        
        <div className="container relative z-10 mx-auto px-6 md:px-8 lg:px-12">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-xl sm:text-2xl font-semibold font-montserrat text-white mb-2">
                Partnership Opportunities
              </h2>
              <p className="text-white/60 font-lato text-sm">
                Choose the partnership model that best fits your business goals
              </p>
            </div>

            {/* Partnership Type Selector */}
            <div className="flex flex-wrap justify-center gap-2 mb-8">
              {partnershipTypes.map((type) => (
                <button
                  key={type.id}
                  onClick={() => setSelectedPartnership(type.id)}
                  className={`px-4 py-2 rounded-full font-lato font-medium transition-all text-xs ${
                    selectedPartnership === type.id
                      ? 'bg-[#34D164] text-white'
                      : 'bg-white/10 backdrop-blur-sm border border-white/20 text-white hover:bg-white/20'
                  }`}
                >
                  {type.title.split(' ').slice(0, 2).join(' ')}
                </button>
              ))}
            </div>

            {/* Selected Partnership Details */}
            {partnershipTypes.map((type) => (
              type.id === selectedPartnership && (
                <div key={type.id} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                  <div className="grid lg:grid-cols-3 gap-6">
                    {/* Icon and Title */}
                    <div className="text-center lg:text-left">
                      <div className="w-12 h-12 bg-[#34D164]/20 rounded-xl flex items-center justify-center mx-auto lg:mx-0 mb-4">
                        <type.icon size={20} className="text-[#34D164]" />
                      </div>
                      <h3 className="text-base font-semibold font-montserrat text-white mb-2">
                        {type.title}
                      </h3>
                      <p className="text-white/60 font-lato text-xs leading-relaxed">
                        {type.description}
                      </p>
                    </div>

                    {/* Benefits */}
                    <div>
                      <h4 className="text-sm font-semibold font-montserrat text-white mb-3">Benefits</h4>
                      <div className="space-y-2">
                        {type.benefits.map((benefit, index) => (
                          <div key={index} className="flex items-start gap-2">
                            <CheckCircle size={12} className="text-[#34D164] mt-0.5 shrink-0" />
                            <span className="text-white/70 font-lato text-xs">{benefit}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Examples */}
                    <div>
                      <h4 className="text-sm font-semibold font-montserrat text-white mb-3">Potential Partners</h4>
                      <div className="space-y-2">
                        {type.examples.map((example, index) => (
                          <div key={index} className="bg-white/5 border border-white/10 p-2 rounded-lg">
                            <span className="text-white/80 font-lato text-xs">{example}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )
            ))}
          </div>
        </div>
      </section>

      {/* Partnership Process */}
      <section 
        className="py-14 lg:py-16"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.97), rgba(255,255,255,0.97)), 
            linear-gradient(90deg, rgba(0,0,0,0.03) 1px, transparent 1px),
            linear-gradient(rgba(0,0,0,0.03) 1px, transparent 1px)`,
          backgroundSize: '100% 100%, 20px 20px, 20px 20px'
        }}
      >
        <div className="container mx-auto px-6 md:px-8 lg:px-12">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-xl sm:text-2xl font-semibold font-montserrat text-[#121E3C] mb-2">
                Partnership Process
              </h2>
              <p className="text-gray-500 font-lato text-sm">
                Simple steps to establish a successful partnership
              </p>
            </div>

            <div className="grid md:grid-cols-4 gap-4">
              {partnershipProcess.map((step, index) => (
                <div key={index} className="bg-white rounded-2xl border border-gray-100 p-5 text-center hover:shadow-lg hover:border-[#34D164]/20 transition-all duration-300">
                  <div className="w-10 h-10 bg-[#34D164]/10 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <span className="text-lg font-bold font-montserrat text-[#34D164]">
                      {step.step}
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold font-montserrat text-[#121E3C] mb-2">
                    {step.title}
                  </h3>
                  <p className="text-gray-500 font-lato text-xs">
                    {step.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Success Stories / Testimonials */}
      <section className="relative py-14 lg:py-16 overflow-hidden">
        <div className="absolute inset-0 bg-[#121E3C]" />
        
        <div className="container relative z-10 mx-auto px-6 md:px-8 lg:px-12">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-xl sm:text-2xl font-semibold font-montserrat text-white text-center mb-8">
              Partnership Success Stories
            </h2>
            
            <div className="grid md:grid-cols-2 gap-5">
              {[
                {
                  quote: "ServiceHub has transformed how we connect with skilled professionals. The partnership has opened new revenue streams and strengthened our member services.",
                  company: "Lagos State Artisan Association",
                  type: "Trade Organization Partner"
                },
                {
                  quote: "The integration with ServiceHub has increased our material sales by 40%. Direct access to active tradespeople has been game-changing for our business.",
                  company: "Nigerian Building Materials Ltd",
                  type: "Supplier Partner"
                }
              ].map((testimonial, idx) => (
                <div key={idx} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                  <div className="flex items-center gap-1 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} size={14} className="text-yellow-400 fill-current" />
                    ))}
                  </div>
                  <blockquote className="text-white/80 font-lato text-sm italic mb-4 leading-relaxed">
                    "{testimonial.quote}"
                  </blockquote>
                  <div>
                    <p className="font-semibold font-montserrat text-white text-sm">
                      {testimonial.company}
                    </p>
                    <p className="text-[10px] text-white/50 font-lato">{testimonial.type}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Contact Form */}
      <section 
        id="contact-form" 
        className="py-14 lg:py-16"
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
                Start Your Partnership Journey
              </h2>
              <p className="text-gray-500 font-lato text-sm">
                Ready to explore partnership opportunities? Get in touch with our team today
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Contact Information */}
              <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <h3 className="text-base font-semibold font-montserrat text-[#121E3C] mb-5">Get in Touch</h3>
                
                <div className="space-y-4">
                  {[
                    { icon: Mail, title: 'Email Us', value: 'partnerships@myservicehub.co', sub: 'We respond within 24 hours' },
                    { icon: Phone, title: 'Call Us', value: '+2348141831420', sub: 'Mon-Fri, 9AM-6PM WAT' },
                    { icon: MapPin, title: 'Visit Us', value: 'Lagos, Nigeria', sub: 'Schedule an appointment' }
                  ].map((contact, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <div className="w-9 h-9 bg-[#34D164]/10 rounded-xl flex items-center justify-center shrink-0">
                        <contact.icon size={16} className="text-[#34D164]" />
                      </div>
                      <div>
                        <h4 className="text-xs font-semibold font-montserrat text-[#121E3C] mb-0.5">{contact.title}</h4>
                        <p className="text-gray-600 font-lato text-xs">{contact.value}</p>
                        <p className="text-[10px] text-gray-400 font-lato">{contact.sub}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 pt-5 border-t border-gray-100">
                  <h4 className="text-xs font-semibold font-montserrat text-[#121E3C] mb-2">Partnership Enquiry</h4>
                  <p className="text-gray-500 font-lato text-xs mb-3">
                    Send us your company information and partnership interests:
                  </p>
                  <div className="bg-[#34D164]/10 p-3 rounded-xl">
                    <p className="text-[#34D164] font-lato text-xs font-semibold">partnerships@myservicehub.co</p>
                  </div>
                </div>
              </div>

              {/* Partnership Benefits Recap */}
              <div className="bg-[#121E3C] rounded-2xl p-6">
                <h3 className="text-base font-semibold font-montserrat text-white mb-5">Partnership Benefits</h3>
                
                <div className="space-y-3 mb-6">
                  {[
                    'Access to verified professional network',
                    'Revenue sharing and growth opportunities',
                    'Co-marketing and brand exposure',
                    'Technical integration support',
                    'Dedicated partnership management',
                    'Data insights and analytics sharing'
                  ].map((benefit, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <CheckCircle size={14} className="text-[#34D164] shrink-0" />
                      <span className="text-white/80 font-lato text-xs">{benefit}</span>
                    </div>
                  ))}
                </div>
                
                <Button 
                  onClick={() => window.location.href = 'mailto:partnerships@myservicehub.co?subject=Partnership Inquiry&body=Hi ServiceHub Team,%0A%0AI am interested in exploring partnership opportunities with ServiceHub.%0A%0ACompany Name:%0APartnership Type:%0AContact Person:%0APhone Number:%0A%0APlease contact me to discuss further.%0A%0AThank you!'} 
                  className="w-full bg-[#34D164] hover:bg-[#2ab854] text-white py-2.5 rounded-full text-sm font-medium transition-colors"
                >
                  Send Partnership Inquiry
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default PartnershipPage;
