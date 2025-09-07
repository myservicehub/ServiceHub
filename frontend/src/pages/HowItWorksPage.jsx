import React, { useState } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent } from '../components/ui/card';
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
  Clock,
  Award,
  Zap,
  ArrowRight,
  Play
} from 'lucide-react';

const HowItWorksPage = () => {
  const [activeTab, setActiveTab] = useState('homeowner');
  const { isTradesperson, isAuthenticated } = useAuth();

  const homeownerSteps = [
    {
      step: 1,
      icon: FileText,
      title: "Post Your Job",
      description: "Describe your project with details, location, timeline, and budget. It's free to post!",
      details: [
        "Choose from 28+ service categories",
        "Set your location and timeline", 
        "Add photos if helpful",
        "Specify your budget range"
      ]
    },
    {
      step: 2,
      icon: Heart,
      title: "Receive Interest",
      description: "Verified tradespeople show interest in your job by paying a small access fee.",
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
      icon: Coins,
      title: "Show Interest (Small Fee)",
      description: "Pay a small access fee (typically 15 coins/₦1,500) to show serious interest in jobs.",
      details: [
        "Fund your wallet via bank transfer",
        "Pay only for jobs you're serious about",
        "Access fee filters out non-serious inquiries",
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
      icon: Coins,
      title: "Coin-Based System",
      description: "Fair access fee system ensures serious inquiries and quality connections"
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
      description: "Earn coins by referring friends and family to join the ServiceHub community"
    },
    {
      icon: Zap,
      title: "Instant Notifications",
      description: "Real-time email and SMS notifications keep you updated on all activity"
    }
  ];

  const stats = [
    { number: "28+", label: "Service Categories" },
    { number: "8", label: "Nigerian States" },
    { number: "15", label: "Average Access Fee (Coins)" },
    { number: "5-200km", label: "Service Radius" }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      {/* Hero Section */}
      <section className="py-16 bg-gradient-to-r from-green-50 to-blue-50">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Play size={40} style={{color: '#2F8140'}} />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold font-montserrat mb-6" style={{color: '#121E3C'}}>
              How ServiceHub Works
            </h1>
            <p className="text-xl text-gray-600 font-lato mb-8">
              Connecting Nigerian homeowners with trusted professionals in 5 simple steps
            </p>
            
            {/* Tab Selector */}
            <div className="inline-flex bg-white rounded-lg p-1 shadow-md">
              <button
                onClick={() => setActiveTab('homeowner')}
                className={`px-6 py-3 rounded-lg font-lato font-semibold transition-all ${
                  activeTab === 'homeowner'
                    ? 'bg-green-600 text-white shadow-md'
                    : 'text-gray-600 hover:text-green-600'
                }`}
              >
                For Homeowners
              </button>
              <button
                onClick={() => setActiveTab('tradesperson')}
                className={`px-6 py-3 rounded-lg font-lato font-semibold transition-all ${
                  activeTab === 'tradesperson'
                    ? 'bg-green-600 text-white shadow-md'
                    : 'text-gray-600 hover:text-green-600'
                }`}
              >
                For Tradespeople
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Steps Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            {/* Steps */}
            <div className="space-y-8">
              {(activeTab === 'homeowner' ? homeownerSteps : tradespersonSteps).map((stepData, index) => (
                <Card key={index} className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
                  <CardContent className="p-8">
                    <div className="grid md:grid-cols-12 gap-6 items-center">
                      {/* Step Number & Icon */}
                      <div className="md:col-span-2 text-center">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <stepData.icon size={32} style={{color: '#2F8140'}} />
                        </div>
                        <div className="text-3xl font-bold font-montserrat" style={{color: '#2F8140'}}>
                          {stepData.step}
                        </div>
                      </div>
                      
                      {/* Content */}
                      <div className="md:col-span-10">
                        <h3 className="text-2xl font-bold font-montserrat mb-3" style={{color: '#121E3C'}}>
                          {stepData.title}
                        </h3>
                        <p className="text-lg text-gray-700 font-lato mb-4 leading-relaxed">
                          {stepData.description}
                        </p>
                        
                        {/* Details */}
                        <div className="grid md:grid-cols-2 gap-3">
                          {stepData.details.map((detail, detailIndex) => (
                            <div key={detailIndex} className="flex items-start space-x-3">
                              <CheckCircle size={16} className="text-green-500 mt-1 flex-shrink-0" />
                              <span className="text-gray-600 font-lato text-sm">{detail}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    
                    {/* Arrow to next step */}
                    {index < (activeTab === 'homeowner' ? homeownerSteps : tradespersonSteps).length - 1 && (
                      <div className="flex justify-center mt-6">
                        <ArrowRight size={24} className="text-green-500" />
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Platform Features */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold font-montserrat mb-4" style={{color: '#121E3C'}}>
                Why Choose ServiceHub?
              </h2>
              <p className="text-lg text-gray-600 font-lato">
                Advanced features that make finding and hiring professionals easy and safe
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {platformFeatures.map((feature, index) => (
                <Card key={index} className="border-0 shadow-md hover:shadow-lg transition-shadow duration-300 h-full">
                  <CardContent className="p-6 text-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <feature.icon size={32} style={{color: '#2F8140'}} />
                    </div>
                    <h3 className="text-xl font-bold font-montserrat mb-3" style={{color: '#121E3C'}}>
                      {feature.title}
                    </h3>
                    <p className="text-gray-600 font-lato leading-relaxed">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Statistics */}
      <section className="py-16 bg-gradient-to-r from-green-600 to-green-700 text-white">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-bold font-montserrat mb-12">
              ServiceHub by the Numbers
            </h2>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {stats.map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="text-4xl md:text-5xl font-bold font-montserrat mb-2">
                    {stat.number}
                  </div>
                  <div className="text-green-100 font-lato">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* How The Coin System Works */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold font-montserrat mb-4" style={{color: '#121E3C'}}>
                Understanding Our Coin System
              </h2>
              <p className="text-lg text-gray-600 font-lato">
                Fair and transparent pricing that ensures quality connections
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <Card className="border-0 shadow-lg">
                <CardContent className="p-8">
                  <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Coins size={32} className="text-yellow-600" />
                    </div>
                    <h3 className="text-2xl font-bold font-montserrat" style={{color: '#121E3C'}}>
                      For Tradespeople
                    </h3>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex items-start space-x-3">
                      <CheckCircle size={20} className="text-green-500 mt-1" />
                      <div>
                        <h4 className="font-semibold font-montserrat">Fund Your Wallet</h4>
                        <p className="text-sm text-gray-600 font-lato">Add coins via bank transfer to Kuda Bank</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-3">
                      <CheckCircle size={20} className="text-green-500 mt-1" />
                      <div>
                        <h4 className="font-semibold font-montserrat">Show Interest (15 coins)</h4>
                        <p className="text-sm text-gray-600 font-lato">Pay access fee only for jobs you're serious about</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-3">
                      <CheckCircle size={20} className="text-green-500 mt-1" />
                      <div>
                        <h4 className="font-semibold font-montserrat">Earn Through Referrals</h4>
                        <p className="text-sm text-gray-600 font-lato">Get 5 coins for verified referrals, 15 for withdrawals</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg">
                <CardContent className="p-8">
                  <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Users size={32} className="text-blue-600" />
                    </div>
                    <h3 className="text-2xl font-bold font-montserrat" style={{color: '#121E3C'}}>
                      For Homeowners
                    </h3>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex items-start space-x-3">
                      <CheckCircle size={20} className="text-green-500 mt-1" />
                      <div>
                        <h4 className="font-semibold font-montserrat">Free Job Posting</h4>
                        <p className="text-sm text-gray-600 font-lato">Post unlimited jobs at no cost</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-3">
                      <CheckCircle size={20} className="text-green-500 mt-1" />
                      <div>
                        <h4 className="font-semibold font-montserrat">Quality Applications</h4>
                        <p className="text-sm text-gray-600 font-lato">Only serious professionals who pay to apply</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-3">
                      <CheckCircle size={20} className="text-green-500 mt-1" />
                      <div>
                        <h4 className="font-semibold font-montserrat">You Choose</h4>
                        <p className="text-sm text-gray-600 font-lato">Full control over who gets your contact details</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Safety & Trust */}
      <section className="py-16 bg-gray-100">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Shield size={40} style={{color: '#2F8140'}} />
            </div>
            
            <h2 className="text-3xl font-bold font-montserrat mb-6" style={{color: '#121E3C'}}>
              Your Safety & Trust Matter
            </h2>
            
            <div className="grid md:grid-cols-3 gap-8 mb-12">
              <div className="text-center">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <UserCheck size={24} style={{color: '#2F8140'}} />
                </div>
                <h3 className="font-semibold font-montserrat mb-2">ID Verification</h3>
                <p className="text-sm text-gray-600 font-lato">All professionals verify their identity with Nigerian ID documents</p>
              </div>
              
              <div className="text-center">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Star size={24} style={{color: '#2F8140'}} />
                </div>
                <h3 className="font-semibold font-montserrat mb-2">Honest Reviews</h3>
                <p className="text-sm text-gray-600 font-lato">Only verified job completions can leave reviews</p>
              </div>
              
              <div className="text-center">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MessageCircle size={24} style={{color: '#2F8140'}} />
                </div>
                <h3 className="font-semibold font-montserrat mb-2">24/7 Support</h3>
                <p className="text-sm text-gray-600 font-lato">Our team is here to help resolve any issues</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-20 bg-gradient-to-r from-green-600 to-green-700 text-white">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold font-montserrat mb-6">
              Ready to Get Started?
            </h2>
            
            <p className="text-xl font-lato mb-12 opacity-90">
              Join thousands of Nigerians who trust ServiceHub for their service needs
            </p>
            
            <div className="grid md:grid-cols-2 gap-8 mb-12">
              <div className="text-left bg-white bg-opacity-10 p-8 rounded-lg">
                <h3 className="text-2xl font-bold font-montserrat mb-4">Homeowners</h3>
                <ul className="space-y-3 font-lato">
                  <li className="flex items-center">
                    <CheckCircle size={20} className="mr-3 text-green-300" />
                    Post jobs for free
                  </li>
                  <li className="flex items-center">
                    <CheckCircle size={20} className="mr-3 text-green-300" />
                    Connect with verified professionals
                  </li>
                  <li className="flex items-center">
                    <CheckCircle size={20} className="mr-3 text-green-300" />
                    Get quality work done
                  </li>
                </ul>
              </div>
              
              <div className="text-left bg-white bg-opacity-10 p-8 rounded-lg">
                <h3 className="text-2xl font-bold font-montserrat mb-4">Tradespeople</h3>
                <ul className="space-y-3 font-lato">
                  <li className="flex items-center">
                    <CheckCircle size={20} className="mr-3 text-green-300" />
                    Find local work opportunities
                  </li>
                  <li className="flex items-center">
                    <CheckCircle size={20} className="mr-3 text-green-300" />
                    Build your reputation
                  </li>
                  <li className="flex items-center">
                    <CheckCircle size={20} className="mr-3 text-green-300" />
                    Grow your business
                  </li>
                </ul>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-6 justify-center">
              <Button 
                onClick={() => window.location.href = '/post-job'}
                className="bg-white text-green-600 hover:bg-gray-100 px-8 py-4 rounded-lg font-lato font-semibold text-lg shadow-lg"
              >
                Post Your First Job
              </Button>
              
              <Button 
                onClick={() => window.location.href = '/browse-jobs'}
                className="border-2 border-white text-white hover:bg-white hover:text-green-600 px-8 py-4 rounded-lg font-lato font-semibold text-lg transition-colors duration-300"
              >
                Join as Tradesperson
              </Button>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default HowItWorksPage;