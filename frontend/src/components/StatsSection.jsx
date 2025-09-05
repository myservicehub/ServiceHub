import React from 'react';
import { Users, Star, Wrench } from 'lucide-react';

const StatsSection = () => {
  const stats = [
    {
      icon: Users,
      number: '251,959',
      label: 'registered tradespeople',
      color: 'text-green-600'
    },
    {
      icon: Wrench,
      number: '40+',
      label: 'trade categories',
      color: 'text-orange-500'
    },
    {
      icon: Star,
      number: '2,630,834',
      label: 'customer reviews',
      color: 'text-yellow-500'
    }
  ];

  return (
    <section className="py-12 bg-white">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          {stats.map((stat, index) => {
            const IconComponent = stat.icon;
            return (
              <div key={index} className="text-center">
                <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4 ${stat.color}`}>
                  <IconComponent size={32} />
                </div>
                <div className="text-3xl font-bold text-gray-900 mb-2">
                  {stat.number}
                </div>
                <div className="text-gray-600">
                  {stat.label}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default StatsSection;