import React, { useState } from 'react';
import { Button } from './ui/button';
import { ArrowRight, TrendingUp, Clock, Shield } from 'lucide-react';
import AuthModal from './auth/AuthModal';

const TradespeopleCTA = () => {
  const [authModalOpen, setAuthModalOpen] = useState(false);

  const handleJoinClick = () => {
    setAuthModalOpen(true);
  };
  const benefits = [
    {
      icon: TrendingUp,
      title: 'Grow your business',
      description: 'Get a steady stream of local job opportunities'
    },
    {
      icon: Clock,
      title: 'Work on your terms',
      description: 'Choose jobs that match your skills and schedule'
    },
    {
      icon: Shield,
      title: 'Trusted platform',
      description: 'Join over 251,000 verified tradespeople'
    }
  ];

  return (
    <section className="py-16" style={{background: 'linear-gradient(135deg, #2F8140 0%, #121E3C 100%)'}}>
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="text-white">
              <h2 className="text-3xl lg:text-4xl font-bold font-montserrat mb-6">
                Looking for leads?
              </h2>
              <p className="text-xl font-lato mb-8 opacity-90">
                Grow your business with serviceHub. serviceHub is the reliable way to get more of the work you want. 
                Sign up for free to receive a steady stream of local job opportunities that match your skills.
              </p>

              <div className="space-y-6 mb-8">
                {benefits.map((benefit, index) => {
                  const IconComponent = benefit.icon;
                  return (
                    <div key={index} className="flex items-start space-x-4">
                      <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                        <IconComponent size={20} className="text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold font-montserrat text-lg mb-1">{benefit.title}</h3>
                        <p className="opacity-90 font-lato">{benefit.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <Button 
                className="bg-white text-[#121E3C] hover:bg-gray-100 px-8 py-3 text-lg font-semibold font-lato"
                onClick={handleJoinClick}
              >
                Tradespeople join for free
                <ArrowRight size={20} className="ml-2" />
              </Button>
            </div>

            <div className="relative">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
                <div className="text-center text-white">
                  <div className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6" style={{backgroundColor: '#121E3C'}}>
                    <TrendingUp size={40} className="text-white" />
                  </div>
                  <h3 className="text-2xl font-bold font-montserrat mb-4">Join today and start earning</h3>
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <div className="text-3xl font-bold font-montserrat">₦2.5M+</div>
                      <div className="text-sm opacity-80 font-lato">Average annual earnings</div>
                    </div>
                    <div>
                      <div className="text-3xl font-bold font-montserrat">72%</div>
                      <div className="text-sm opacity-80 font-lato">Increase in bookings</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TradespeopleCTA;