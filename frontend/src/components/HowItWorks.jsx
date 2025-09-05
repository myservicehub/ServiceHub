import React from 'react';
import { Button } from './ui/button';
import { Edit3, Users, CheckCircle } from 'lucide-react';

const HowItWorks = () => {
  const steps = [
    {
      number: '1',
      icon: Edit3,
      title: 'Post your job for free',
      description: 'Describe your job and we\'ll match you with qualified tradespeople in your area.'
    },
    {
      number: '2',
      icon: Users,
      title: 'Tradespeople respond',
      description: 'Receive quotes from interested tradespeople and view their profiles and reviews.'
    },
    {
      number: '3',
      icon: CheckCircle,
      title: 'Review profiles and choose',
      description: 'Compare quotes, read reviews, and hire the right tradesperson for your job.'
    }
  ];

  return (
    <section className="py-16 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold font-montserrat mb-4" style={{color: '#121E3C'}}>
              How to hire the right tradesperson
            </h2>
            <p className="text-xl text-gray-600 font-lato max-w-2xl mx-auto">
              Finding reliable tradespeople has never been easier. Follow these simple steps to get your job done.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            {steps.map((step, index) => {
              const IconComponent = step.icon;
              return (
                <div key={index} className="text-center">
                  <div className="relative mb-6">
                    <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4" style={{backgroundColor: '#2F8140'}}>
                      <span className="text-2xl font-bold font-montserrat text-white">{step.number}</span>
                    </div>
                    <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto -mt-6 ml-14" style={{backgroundColor: '#121E3C'}}>
                      <IconComponent size={24} className="text-white" />
                    </div>
                  </div>
                  <h3 className="text-xl font-semibold font-montserrat mb-3" style={{color: '#121E3C'}}>
                    {step.title}
                  </h3>
                  <p className="text-gray-600 font-lato">
                    {step.description}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="text-center">
            <Button className="text-white px-8 py-3 text-lg font-lato hover:opacity-90" style={{backgroundColor: '#2F8140'}}>
              See how it works
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;