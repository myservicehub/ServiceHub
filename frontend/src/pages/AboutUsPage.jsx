import React from 'react';
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

const AboutUsPage = () => {
  const coreValues = [
    {
      icon: Shield,
      title: "Trust & Transparency",
      description: "Verified professionals and honest reviews."
    },
    {
      icon: Users,
      title: "Accessibility", 
      description: "Services available to everyone, anytime."
    },
    {
      icon: TrendingUp,
      title: "Empowerment",
      description: "Helping skilled workers grow sustainable businesses."
    },
    {
      icon: Lightbulb,
      title: "Innovation",
      description: "Using technology to improve service delivery."
    },
    {
      icon: Award,
      title: "Excellence",
      description: "Committed to quality and customer satisfaction."
    },
    {
      icon: CheckCircle,
      title: "Accountability",
      description: "Ensuring fairness and trust for all."
    }
  ];

  const stats = [
    { number: "8", label: "Nigerian States Covered", suffix: "+" },
    { number: "28", label: "Service Categories", suffix: "" },
    { number: "100", label: "Verified Professionals", suffix: "%" },
    { number: "24/7", label: "Platform Availability", suffix: "" }
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
                
                <div className="prose prose-lg max-w-none">
                  <p className="text-gray-700 font-lato text-lg leading-relaxed mb-6">
                    At ServiceHub, we believe finding trusted service professionals in Nigeria should be simple, safe, and stress-free. We are a digital marketplace that connects individuals and businesses with verified, reliable professionals across a wide range of services - from plumbing, electrical repairs, and carpentry to home cleaning, IT support, and more.
                  </p>
                  
                  <p className="text-gray-700 font-lato text-lg leading-relaxed mb-6">
                    Our mission is simple: <strong style={{color: '#2F8140'}}>empower Nigerians with easy access to reliable services while creating opportunities for skilled workers to thrive.</strong>
                  </p>
                  
                  <div className="bg-green-50 border-l-4 border-green-500 p-6 rounded-lg">
                    <p className="text-gray-800 font-lato italic text-lg">
                      "We're not just a platform - we're building a community where trust, quality, and opportunity come together to transform Nigeria's service industry."
                    </p>
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
                  <div className="text-4xl md:text-5xl font-bold font-montserrat mb-2" style={{color: '#2F8140'}}>
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
                      <Target size={24} style={{color: '#2F8140'}} />
                    </div>
                    <h3 className="text-2xl font-bold font-montserrat" style={{color: '#121E3C'}}>
                      Our Mission
                    </h3>
                  </div>
                  
                  <p className="text-gray-700 font-lato text-lg leading-relaxed">
                    To empower Nigerians with easy access to trusted and reliable service professionals, while helping skilled workers grow sustainable businesses through technology, transparency, and opportunity.
                  </p>
                </CardContent>
              </Card>

              {/* Vision */}
              <Card className="border-0 shadow-lg">
                <CardContent className="p-8">
                  <div className="flex items-center mb-6">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mr-4">
                      <Eye size={24} style={{color: '#2F8140'}} />
                    </div>
                    <h3 className="text-2xl font-bold font-montserrat" style={{color: '#121E3C'}}>
                      Our Vision
                    </h3>
                  </div>
                  
                  <p className="text-gray-700 font-lato text-lg leading-relaxed">
                    To become Nigeria's most trusted digital marketplace for professional services, setting the standard for quality, accountability, and convenience in the service industry.
                  </p>
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
                <Card key={index} className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
                  <CardContent className="p-8 text-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                      <value.icon size={32} style={{color: '#2F8140'}} />
                    </div>
                    
                    <h3 className="text-xl font-bold font-montserrat mb-4" style={{color: '#121E3C'}}>
                      {value.title}
                    </h3>
                    
                    <p className="text-gray-600 font-lato leading-relaxed">
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
      <section className="py-16 bg-gradient-to-r from-green-600 to-green-700 text-white">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold font-montserrat mb-6">
              Ready to Experience the ServiceHub Difference?
            </h2>
            
            <p className="text-xl font-lato mb-8 opacity-90">
              Join thousands of Nigerians who trust ServiceHub for their service needs
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button 
                onClick={() => window.location.href = '/post-job'}
                className="bg-white text-green-600 hover:bg-gray-100 px-8 py-3 rounded-lg font-lato font-semibold transition-colors duration-300"
              >
                Post Your First Job
              </button>
              
              <button 
                onClick={() => window.location.href = '/browse-jobs'}
                className="border-2 border-white text-white hover:bg-white hover:text-green-600 px-8 py-3 rounded-lg font-lato font-semibold transition-colors duration-300"
              >
                Find Work Opportunities
              </button>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default AboutUsPage;