import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { Card, CardContent } from '../components/ui/card';
import { 
  Shield, 
  Users, 
  TrendingUp, 
  Lightbulb, 
  Award, 
  CheckCircle,
  Eye,
  Heart,
  Zap,
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
    { number: platformStats?.total_states || "8", suffix: "", label: "Nigerian States" },
    { number: platformStats?.total_jobs || "1,200", suffix: "+", label: "Jobs Completed" }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      {/* Hero Section */}
      <section className="py-16 bg-gradient-to-r from-green-50 to-blue-50">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold font-montserrat mb-6" style={{color: '#121E3C'}}>
              About ServiceHub
            </h1>
            <p className="text-xl text-gray-600 font-lato leading-relaxed">
              Nigeria's trusted digital marketplace connecting you with verified service professionals
            </p>
          </div>
        </div>
      </section>

      {/* Our Story */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <Card className="border-0 shadow-lg">
              <CardContent className="p-8 md:p-12">
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold font-montserrat mb-4" style={{color: '#121E3C'}}>
                    Our Story
                  </h2>
                </div>
                
                <div className="prose prose-lg max-w-none space-y-8">
                  <div className="space-y-6">
                    <p className="text-gray-700 font-lato text-lg leading-relaxed">
                      At ServiceHub, we believe finding trusted service professionals in Nigeria should be <strong>simple</strong>, <strong>safe</strong>, and <strong>stress-free</strong>.
                    </p>
                    
                    <p className="text-gray-700 font-lato text-lg leading-relaxed">
                      We are a digital marketplace that connects individuals and businesses with verified, reliable professionals across a wide range of services including:
                    </p>
                    
                    <div className="grid md:grid-cols-2 gap-4 my-6">
                      <ul className="space-y-2 text-gray-700 font-lato">
                        <li className="flex items-center">
                          <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                          Plumbing & Water Works
                        </li>
                        <li className="flex items-center">
                          <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                          Electrical Repairs & Installation
                        </li>
                        <li className="flex items-center">
                          <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                          Carpentry & Furniture Making
                        </li>
                        <li className="flex items-center">
                          <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                          Building & Construction
                        </li>
                      </ul>
                      <ul className="space-y-2 text-gray-700 font-lato">
                        <li className="flex items-center">
                          <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                          Home Cleaning Services  
                        </li>
                        <li className="flex items-center">
                          <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                          Solar & Generator Services
                        </li>
                        <li className="flex items-center">
                          <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                          CCTV & Security Systems
                        </li>
                        <li className="flex items-center">
                          <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                          And many more...
                        </li>
                      </ul>
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-r from-green-50 to-green-100 border border-green-200 p-8 rounded-xl">
                    <h3 className="text-xl font-bold font-montserrat mb-4" style={{color: '#34D164'}}>
                      Our Simple Mission
                    </h3>
                    <p className="text-gray-800 font-lato text-lg leading-relaxed">
                      <strong>Empower Nigerians</strong> with easy access to reliable services while creating opportunities for <strong>skilled workers to thrive</strong>.
                    </p>
                  </div>
                  
                  <div className="bg-gray-50 border-l-4 border-green-500 p-8 rounded-lg">
                    <blockquote className="text-gray-800 font-lato italic text-xl leading-relaxed">
                      "We're not just a platform - we're building a <strong>community</strong> where trust, quality, and opportunity come together to transform Nigeria's service industry."
                    </blockquote>
                    <footer className="mt-4 text-gray-600 font-lato">
                      — The ServiceHub Team
                    </footer>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold font-montserrat text-center mb-12" style={{color: '#121E3C'}}>
              ServiceHub by the Numbers
            </h2>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {stats.map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="text-4xl md:text-5xl font-bold font-montserrat mb-2" style={{color: '#34D164'}}>
                    {stat.number}{stat.suffix}
                  </div>
                  <div className="text-gray-600 font-lato font-medium">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-2 gap-8">
              {/* Mission */}
              <Card className="border-0 shadow-lg">
                <CardContent className="p-8">
                  <div className="flex items-center mb-6">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mr-4">
                      <Target size={24} style={{color: '#34D164'}} />
                    </div>
                    <h3 className="text-2xl font-bold font-montserrat" style={{color: '#121E3C'}}>
                      Our Mission
                    </h3>
                  </div>
                  
                  <div className="space-y-6">
                    <p className="text-gray-700 font-lato text-lg leading-relaxed">
                      To empower Nigerians with easy access to trusted and reliable service professionals, while helping skilled workers grow sustainable businesses through:
                    </p>
                    
                    <div className="space-y-4">
                      <div className="flex items-start space-x-3">
                        <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mt-1">
                          <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-800 font-montserrat">Technology</h4>
                          <p className="text-gray-600 font-lato">Modern platform connecting users instantly</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start space-x-3">
                        <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mt-1">
                          <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-800 font-montserrat">Transparency</h4>
                          <p className="text-gray-600 font-lato">Clear pricing, honest reviews, verified professionals</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start space-x-3">
                        <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mt-1">
                          <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-800 font-montserrat">Opportunity</h4>
                          <p className="text-gray-600 font-lato">Creating sustainable income for skilled workers</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Vision */}
              <Card className="border-0 shadow-lg">
                <CardContent className="p-8">
                  <div className="flex items-center mb-6">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mr-4">
                      <Eye size={24} style={{color: '#34D164'}} />
                    </div>
                    <h3 className="text-2xl font-bold font-montserrat" style={{color: '#121E3C'}}>
                      Our Vision
                    </h3>
                  </div>
                  
                  <div className="space-y-6">
                    <p className="text-gray-700 font-lato text-lg leading-relaxed">
                      To become Nigeria's most trusted digital marketplace for professional services, setting the standard for:
                    </p>
                    
                    <div className="grid grid-cols-1 gap-4">
                      <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                        <h4 className="font-semibold text-blue-800 font-montserrat mb-2">Quality</h4>
                        <p className="text-blue-700 font-lato text-sm">Only verified, skilled professionals on our platform</p>
                      </div>
                      
                      <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                        <h4 className="font-semibold text-blue-800 font-montserrat mb-2">Accountability</h4>
                        <p className="text-blue-700 font-lato text-sm">Transparent reviews and reliable dispute resolution</p>
                      </div>
                      
                      <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                        <h4 className="font-semibold text-blue-800 font-montserrat mb-2">Convenience</h4>
                        <p className="text-blue-700 font-lato text-sm">Easy booking, secure payments, and 24/7 support</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Core Values */}
      <section className="py-16 bg-gray-100">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold font-montserrat mb-4" style={{color: '#121E3C'}}>
                Our Core Values
              </h2>
              <p className="text-lg text-gray-600 font-lato">
                The principles that guide everything we do at ServiceHub
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {coreValues.map((value, index) => (
                <Card key={index} className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300 h-full">
                  <CardContent className="p-8">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                      <value.icon size={32} style={{color: '#34D164'}} />
                    </div>
                    
                    <h3 className="text-xl font-bold font-montserrat mb-4 text-center" style={{color: '#121E3C'}}>
                      {value.title}
                    </h3>
                    
                    <p className="text-gray-600 font-lato leading-relaxed text-center">
                      {value.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-20 bg-gradient-to-r from-green-600 to-green-700 text-white">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold font-montserrat mb-8">
              Ready to Experience the ServiceHub Difference?
            </h2>
            
            <div className="grid md:grid-cols-2 gap-8 mb-12">
              <div className="space-y-4">
                <h3 className="text-xl font-semibold font-montserrat">For Homeowners</h3>
                <p className="text-lg font-lato opacity-90 leading-relaxed">
                  Get your projects done by trusted, verified professionals. From small repairs to major renovations.
                </p>
              </div>
              
              <div className="space-y-4">
                <h3 className="text-xl font-semibold font-montserrat">For Tradespeople</h3>
                <p className="text-lg font-lato opacity-90 leading-relaxed">
                  Grow your business with a steady stream of local customers. Build your reputation and increase your income.
                </p>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-6 justify-center">
              <button 
                onClick={() => window.location.href = '/post-job'}
                className="bg-white text-green-600 hover:bg-gray-100 px-8 py-4 rounded-lg font-lato font-semibold text-lg transition-colors duration-300 shadow-lg"
              >
                Post Your First Job
              </button>
              
              <button 
                onClick={() => window.location.href = '/browse-jobs'}
                className="border-2 border-white text-white hover:bg-white hover:text-green-600 px-8 py-4 rounded-lg font-lato font-semibold text-lg transition-colors duration-300"
              >
                Find Work Opportunities
              </button>
            </div>
            
            <p className="text-sm font-lato opacity-75 mt-8">
              Join thousands of Nigerians who trust ServiceHub for their service needs
            </p>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default AboutUsPage;
