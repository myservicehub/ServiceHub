import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import TradespersonRegistration from '../components/auth/TradespersonRegistration';
import { Button } from '../components/ui/button';
import { CheckCircle, Users, Star, TrendingUp, Zap, DollarSign } from 'lucide-react';

const JoinForFreePage = () => {
  const navigate = useNavigate();
  const [showRegistration, setShowRegistration] = useState(false);

  const benefits = [
    {
      icon: DollarSign,
      title: "₦2.5M+ Average Annual Earnings",
      description: "Our verified tradespeople earn significantly more than industry average"
    },
    {
      icon: TrendingUp,
      title: "72% Increase in Bookings",
      description: "Get more consistent work with our lead generation system"
    },
    {
      icon: Users,
      title: "200+ Active Users Daily",
      description: "Connect with homeowners actively looking for your services"
    },
    {
      icon: Star,
      title: "Build Your Reputation",
      description: "Verified reviews system helps you build trust and credibility"
    },
    {
      icon: Zap,
      title: "Instant Notifications",
      description: "Get notified immediately when jobs match your skills"
    },
    {
      icon: CheckCircle,
      title: "Quality Guaranteed",
      description: "We verify all jobs and homeowners for your safety"
    }
  ];

  const steps = [
    {
      number: "1",
      title: "Create Your Profile",
      description: "Fill out your professional details, upload ID, and showcase your skills"
    },
    {
      number: "2", 
      title: "Pass Skills Assessment",
      description: "Complete our trade-specific skills test to get verified"
    },
    {
      number: "3",
      title: "Start Receiving Jobs",
      description: "Get matched with homeowners and start earning immediately"
    }
  ];

  const testimonials = [
    {
      name: "Adebayo Okonkwo",
      trade: "Electrician",
      location: "Lagos",
      rating: 4.9,
      review: "ServiceHub has transformed my business. I now get 5-8 jobs per week and my income has doubled. The platform is easy to use and customers are genuine.",
      earnings: "₦380,000/month"
    },
    {
      name: "Fatima Hassan",
      trade: "Painter & Decorator",
      location: "Abuja",
      rating: 4.8,
      review: "Best decision I made was joining ServiceHub. The lead quality is excellent and I can work on my own terms. Highly recommend to fellow tradespeople.",
      earnings: "₦290,000/month"
    },
    {
      name: "Chidi Okwu",
      trade: "Plumber",
      location: "Port Harcourt",
      rating: 5.0,
      review: "ServiceHub helped me grow from doing 2-3 jobs per month to 15+ jobs. The verification system gives customers confidence in my work.",
      earnings: "₦420,000/month"
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-green-600 via-green-700 to-green-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold mb-6">
                Join Nigeria's #1 Platform for Tradespeople
              </h1>
              <p className="text-xl mb-8 text-green-100">
                Connect with homeowners across Nigeria and grow your business. 
                Registration is completely free and takes just 10 minutes.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <Button
                  onClick={() => setShowRegistration(true)}
                  className="bg-green-600 hover:bg-green-700 text-white px-8 py-4 text-lg font-semibold"
                >
                  Start Registration - It's Free
                </Button>
                <Button
                  onClick={() => navigate('/help-centre')}
                  className="bg-green-600 hover:bg-green-700 text-white px-8 py-4 text-lg font-semibold"
                >
                  Learn More
                </Button>
              </div>

              <div className="flex items-center space-x-6 text-green-100">
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 mr-2" />
                  <span>Free to join</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 mr-2" />
                  <span>No subscription fees</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 mr-2" />
                  <span>Instant setup</span>
                </div>
              </div>
            </div>

            <div className="text-center">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <div className="text-4xl font-bold text-white">251K+</div>
                    <div className="text-green-200">Tradespeople</div>
                  </div>
                  <div>
                    <div className="text-4xl font-bold text-white">43+</div>
                    <div className="text-green-200">Trade Categories</div>
                  </div>
                  <div>
                    <div className="text-4xl font-bold text-white">₦2.5M</div>
                    <div className="text-green-200">Avg. Annual Income</div>
                  </div>
                  <div>
                    <div className="text-4xl font-bold text-white">4.8★</div>
                    <div className="text-green-200">Platform Rating</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Benefits Section */}
      <div className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Why Choose ServiceHub?
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Join thousands of successful tradespeople who have grown their business with ServiceHub
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {benefits.map((benefit, index) => (
              <div key={index} className="bg-gray-50 rounded-xl p-6 hover:shadow-lg transition-shadow">
                <benefit.icon className="w-12 h-12 text-green-600 mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {benefit.title}
                </h3>
                <p className="text-gray-600">
                  {benefit.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* How It Works Section */}
      <div className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              How to Get Started
            </h2>
            <p className="text-xl text-gray-600">
              Three simple steps to start earning more
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((step, index) => (
              <div key={index} className="text-center">
                <div className="bg-green-600 text-white w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-6">
                  {step.number}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">
                  {step.title}
                </h3>
                <p className="text-gray-600">
                  {step.description}
                </p>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <Button
              onClick={() => setShowRegistration(true)}
              className="bg-green-600 hover:bg-green-700 text-white px-8 py-4 text-lg font-semibold"
            >
              Get Started Now - Free Registration
            </Button>
          </div>
        </div>
      </div>

      {/* Testimonials Section */}
      <div className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Success Stories
            </h2>
            <p className="text-xl text-gray-600">
              Real tradespeople, real results
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="bg-gray-50 rounded-xl p-6">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center text-white font-bold">
                    {testimonial.name.charAt(0)}
                  </div>
                  <div className="ml-4">
                    <h4 className="font-semibold text-gray-900">{testimonial.name}</h4>
                    <p className="text-sm text-gray-600">{testimonial.trade} • {testimonial.location}</p>
                  </div>
                  <div className="ml-auto">
                    <div className="flex items-center">
                      <Star className="w-4 h-4 text-yellow-400 fill-current" />
                      <span className="ml-1 text-sm font-semibold">{testimonial.rating}</span>
                    </div>
                  </div>
                </div>
                
                <p className="text-gray-700 mb-4 italic">
                  "{testimonial.review}"
                </p>
                
                <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold inline-block">
                  Earning: {testimonial.earnings}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-20 bg-gradient-to-r from-green-600 to-green-700 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to Transform Your Business?
          </h2>
          <p className="text-xl mb-8 text-green-100">
            Join over 5000+ tradespeople already earning more with ServiceHub
          </p>
          
          <Button
            onClick={() => setShowRegistration(true)}
            className="bg-green-600 hover:bg-green-700 text-white px-12 py-4 text-xl font-semibold"
          >
            Join for Free - Start Today
          </Button>
          
          <p className="mt-4 text-green-200">
            Registration takes less than 10 minutes • No credit card required
          </p>
        </div>
      </div>

      {/* Registration Modal */}
      {showRegistration && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900">Join ServiceHub - Free Registration</h3>
                <button
                  onClick={() => setShowRegistration(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
                >
                  ×
                </button>
              </div>
              <TradespersonRegistration />
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default JoinForFreePage;