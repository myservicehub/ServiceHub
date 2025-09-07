import React, { useState } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
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
  const [selectedPartnership, setSelectedPartnership] = useState('trade-organizations');

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
      description: 'Access to thousands of verified homeowners and skilled tradespeople across 8 Nigerian states'
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
    { number: '8+', label: 'Nigerian States Covered' },
    { number: '28+', label: 'Service Categories' },
    { number: '1000+', label: 'Active Users' },
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
      <section className="py-16 bg-gradient-to-r from-blue-50 to-green-50">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Handshake size={40} style={{color: '#2F8140'}} />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold font-montserrat mb-6" style={{color: '#121E3C'}}>
              Partner with ServiceHub
            </h1>
            <p className="text-xl text-gray-600 font-lato mb-8">
              Join Nigeria's leading digital marketplace for professional services and unlock new growth opportunities
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                onClick={() => document.getElementById('contact-form').scrollIntoView({ behavior: 'smooth' })}
                className="bg-green-600 hover:bg-green-700 text-white px-8 py-4 rounded-lg font-lato font-semibold text-lg"
              >
                Become a Partner
              </Button>
              <Button 
                onClick={() => document.getElementById('partnership-types').scrollIntoView({ behavior: 'smooth' })}
                variant="outline"
                className="border-2 border-green-600 text-green-600 hover:bg-green-50 px-8 py-4 rounded-lg font-lato font-semibold text-lg"
              >
                Explore Opportunities
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Statistics */}
      <section className="py-12 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold font-montserrat text-center mb-8" style={{color: '#121E3C'}}>
              Growing Platform, Growing Opportunities
            </h2>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {stats.map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="text-4xl md:text-5xl font-bold font-montserrat mb-2" style={{color: '#2F8140'}}>
                    {stat.number}
                  </div>
                  <div className="text-gray-600 font-lato">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Partnership Benefits */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold font-montserrat mb-4" style={{color: '#121E3C'}}>
                Why Partner with ServiceHub?
              </h2>
              <p className="text-lg text-gray-600 font-lato">
                Join a trusted platform that's transforming Nigeria's service industry
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {partnershipBenefits.map((benefit, index) => (
                <Card key={index} className="border-0 shadow-md hover:shadow-lg transition-shadow duration-300 h-full">
                  <CardContent className="p-6 text-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <benefit.icon size={32} style={{color: '#2F8140'}} />
                    </div>
                    <h3 className="text-xl font-bold font-montserrat mb-3" style={{color: '#121E3C'}}>
                      {benefit.title}
                    </h3>
                    <p className="text-gray-600 font-lato leading-relaxed">
                      {benefit.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Partnership Types */}
      <section id="partnership-types" className="py-16 bg-gray-100">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold font-montserrat mb-4" style={{color: '#121E3C'}}>
                Partnership Opportunities
              </h2>
              <p className="text-lg text-gray-600 font-lato">
                Choose the partnership model that best fits your business goals
              </p>
            </div>

            {/* Partnership Type Selector */}
            <div className="flex flex-wrap justify-center gap-2 mb-8">
              {partnershipTypes.map((type) => (
                <button
                  key={type.id}
                  onClick={() => setSelectedPartnership(type.id)}
                  className={`px-4 py-2 rounded-lg font-lato font-medium transition-all text-sm ${
                    selectedPartnership === type.id
                      ? 'bg-green-600 text-white shadow-md'
                      : 'bg-white text-gray-600 hover:bg-green-50 hover:text-green-600'
                  }`}
                >
                  {type.title}
                </button>
              ))}
            </div>

            {/* Selected Partnership Details */}
            {partnershipTypes.map((type) => (
              type.id === selectedPartnership && (
                <Card key={type.id} className="border-0 shadow-lg">
                  <CardContent className="p-8">
                    <div className="grid md:grid-cols-12 gap-8">
                      {/* Icon and Title */}
                      <div className="md:col-span-12 lg:col-span-3 text-center lg:text-left">
                        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto lg:mx-0 mb-4">
                          <type.icon size={40} style={{color: '#2F8140'}} />
                        </div>
                        <h3 className="text-2xl font-bold font-montserrat mb-4" style={{color: '#121E3C'}}>
                          {type.title}
                        </h3>
                        <p className="text-gray-600 font-lato leading-relaxed">
                          {type.description}
                        </p>
                      </div>

                      {/* Benefits */}
                      <div className="md:col-span-6 lg:col-span-5">
                        <h4 className="text-xl font-semibold font-montserrat mb-4" style={{color: '#121E3C'}}>
                          Partnership Benefits
                        </h4>
                        <div className="space-y-3">
                          {type.benefits.map((benefit, index) => (
                            <div key={index} className="flex items-start space-x-3">
                              <CheckCircle size={16} className="text-green-500 mt-1 flex-shrink-0" />
                              <span className="text-gray-700 font-lato text-sm">{benefit}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Examples */}
                      <div className="md:col-span-6 lg:col-span-4">
                        <h4 className="text-xl font-semibold font-montserrat mb-4" style={{color: '#121E3C'}}>
                          Potential Partners
                        </h4>
                        <div className="space-y-2">
                          {type.examples.map((example, index) => (
                            <div key={index} className="bg-green-50 p-3 rounded-lg">
                              <span className="text-green-800 font-lato text-sm font-medium">{example}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            ))}
          </div>
        </div>
      </section>

      {/* Partnership Process */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold font-montserrat mb-4" style={{color: '#121E3C'}}>
                Partnership Process
              </h2>
              <p className="text-lg text-gray-600 font-lato">
                Simple steps to establish a successful partnership with ServiceHub
              </p>
            </div>

            <div className="space-y-8">
              {partnershipProcess.map((step, index) => (
                <div key={index} className="flex items-center space-x-6">
                  <div className="flex-shrink-0">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                      <span className="text-2xl font-bold font-montserrat" style={{color: '#2F8140'}}>
                        {step.step}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold font-montserrat mb-2" style={{color: '#121E3C'}}>
                      {step.title}
                    </h3>
                    <p className="text-gray-600 font-lato">
                      {step.description}
                    </p>
                  </div>

                  {index < partnershipProcess.length - 1 && (
                    <ArrowRight size={24} className="text-green-500 hidden md:block" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Success Stories / Testimonials */}
      <section className="py-16 bg-gradient-to-r from-green-50 to-blue-50">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-bold font-montserrat mb-12" style={{color: '#121E3C'}}>
              Partnership Success Stories
            </h2>
            
            <div className="grid md:grid-cols-2 gap-8">
              <Card className="border-0 shadow-lg">
                <CardContent className="p-8">
                  <div className="flex items-center mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} size={20} className="text-yellow-400 fill-current" />
                    ))}
                  </div>
                  <blockquote className="text-lg text-gray-700 font-lato italic mb-4">
                    "ServiceHub has transformed how we connect with skilled professionals. The partnership has opened new revenue streams and strengthened our member services."
                  </blockquote>
                  <div className="text-left">
                    <p className="font-semibold font-montserrat" style={{color: '#121E3C'}}>
                      Lagos State Artisan Association
                    </p>
                    <p className="text-sm text-gray-600 font-lato">Trade Organization Partner</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg">
                <CardContent className="p-8">
                  <div className="flex items-center mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} size={20} className="text-yellow-400 fill-current" />
                    ))}
                  </div>
                  <blockquote className="text-lg text-gray-700 font-lato italic mb-4">
                    "The integration with ServiceHub has increased our material sales by 40%. Direct access to active tradespeople has been game-changing for our business."
                  </blockquote>
                  <div className="text-left">
                    <p className="font-semibold font-montserrat" style={{color: '#121E3C'}}>
                      Nigerian Building Materials Ltd
                    </p>
                    <p className="text-sm text-gray-600 font-lato">Supplier Partner</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Form */}
      <section id="contact-form" className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold font-montserrat mb-4" style={{color: '#121E3C'}}>
                Start Your Partnership Journey
              </h2>
              <p className="text-lg text-gray-600 font-lato">
                Ready to explore partnership opportunities? Get in touch with our team today
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Contact Information */}
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-2xl font-bold font-montserrat" style={{color: '#121E3C'}}>
                    Get in Touch
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                      <Mail size={24} style={{color: '#2F8140'}} />
                    </div>
                    <div>
                      <h4 className="font-semibold font-montserrat mb-1">Email Us</h4>
                      <p className="text-gray-600 font-lato">partnerships@myservicehub.co</p>
                      <p className="text-sm text-gray-500 font-lato">We respond within 24 hours</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                      <Phone size={24} style={{color: '#2F8140'}} />
                    </div>
                    <div>
                      <h4 className="font-semibold font-montserrat mb-1">Call Us</h4>
                      <p className="text-gray-600 font-lato">+234 (0) 800 SERVICE</p>
                      <p className="text-sm text-gray-500 font-lato">Mon-Fri, 9AM-6PM WAT</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                      <MapPin size={24} style={{color: '#2F8140'}} />
                    </div>
                    <div>
                      <h4 className="font-semibold font-montserrat mb-1">Visit Us</h4>
                      <p className="text-gray-600 font-lato">Lagos, Nigeria</p>
                      <p className="text-sm text-gray-500 font-lato">Schedule an appointment</p>
                    </div>
                  </div>

                  <div className="pt-6 border-t">
                    <h4 className="font-semibold font-montserrat mb-3">Partnership Enquiry Form</h4>
                    <p className="text-sm text-gray-600 font-lato mb-4">
                      For detailed partnership discussions, please send us your company information and partnership interests to:
                    </p>
                    <div className="bg-green-50 p-4 rounded-lg">
                      <p className="text-green-800 font-lato font-semibold">partnerships@myservicehub.co</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Partnership Benefits Recap */}
              <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-green-100">
                <CardHeader>
                  <CardTitle className="text-2xl font-bold font-montserrat" style={{color: '#121E3C'}}>
                    Partnership Benefits
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <CheckCircle size={20} className="text-green-600" />
                    <span className="text-gray-700 font-lato">Access to verified professional network</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <CheckCircle size={20} className="text-green-600" />
                    <span className="text-gray-700 font-lato">Revenue sharing and growth opportunities</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <CheckCircle size={20} className="text-green-600" />
                    <span className="text-gray-700 font-lato">Co-marketing and brand exposure</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <CheckCircle size={20} className="text-green-600" />
                    <span className="text-gray-700 font-lato">Technical integration support</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <CheckCircle size={20} className="text-green-600" />
                    <span className="text-gray-700 font-lato">Dedicated partnership management</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <CheckCircle size={20} className="text-green-600" />
                    <span className="text-gray-700 font-lato">Data insights and analytics sharing</span>
                  </div>
                  
                  <div className="pt-6">
                    <Button 
                      onClick={() => window.location.href = 'mailto:partnerships@myservicehub.co?subject=Partnership Inquiry&body=Hi ServiceHub Team,%0A%0AI am interested in exploring partnership opportunities with ServiceHub.%0A%0ACompany Name:%0APartnership Type:%0AContact Person:%0APhone Number:%0A%0APlease contact me to discuss further.%0A%0AThank you!'} 
                      className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-lato font-semibold"
                    >
                      Send Partnership Inquiry
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default PartnershipPage;