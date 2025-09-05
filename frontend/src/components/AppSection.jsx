import React from 'react';
import { Button } from './ui/button';
import { Smartphone, Camera, MessageCircle, Star } from 'lucide-react';

const AppSection = () => {
  const features = [
    {
      icon: Camera,
      title: 'Add photos instantly',
      description: 'Capture and upload job photos directly from your phone'
    },
    {
      icon: MessageCircle,
      title: 'Stay connected',
      description: 'Message tradespeople wherever you are with instant notifications'
    },
    {
      icon: Star,
      title: 'Rate and review',
      description: 'Leave ratings and reviews straight from your phone once the job is done'
    }
  ];

  return (
    <section className="py-16 bg-white">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-6">
                Download our app
              </h2>
              <p className="text-xl text-gray-600 mb-8">
                Posting and managing your jobs is even easier with the serviceHub app. 
                Add photos and information in an instant and keep things moving with 
                notifications and chat.
              </p>

              <div className="space-y-6 mb-8">
                {features.map((feature, index) => {
                  const IconComponent = feature.icon;
                  return (
                    <div key={index} className="flex items-start space-x-4">
                      <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <IconComponent size={24} className="text-green-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg text-gray-900 mb-1">
                          {feature.title}
                        </h3>
                        <p className="text-gray-600">
                          {feature.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <Button className="bg-black hover:bg-gray-800 text-white px-6 py-3">
                  <div className="flex items-center space-x-2">
                    <div className="text-left">
                      <div className="text-xs">Download on the</div>
                      <div className="text-sm font-semibold">App Store</div>
                    </div>
                  </div>
                </Button>
                <Button className="bg-black hover:bg-gray-800 text-white px-6 py-3">
                  <div className="flex items-center space-x-2">
                    <div className="text-left">
                      <div className="text-xs">Get it on</div>
                      <div className="text-sm font-semibold">Google Play</div>
                    </div>
                  </div>
                </Button>
              </div>

              <p className="text-sm text-gray-500 mt-4">
                Also available: <span className="text-green-600 hover:underline cursor-pointer">Tradesperson app</span>
              </p>
            </div>

            <div className="relative">
              <div className="bg-gradient-to-br from-green-50 to-orange-50 rounded-3xl p-8 text-center">
                <div className="w-32 h-64 bg-gray-900 rounded-3xl mx-auto relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-b from-green-400 to-green-600 p-6">
                    <div className="bg-white rounded-lg p-4 mb-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <div className="w-4 h-4 rounded-full" style={{backgroundColor: '#2F8140'}}></div>
                        <span className="text-xs font-semibold font-montserrat">
                          <span style={{color: '#121E3C'}}>Service</span>
                          <span style={{color: '#2F8140'}}>Hub</span>
                        </span>
                      </div>
                      <div className="text-left text-xs space-y-1">
                        <div className="bg-gray-100 h-2 rounded"></div>
                        <div className="bg-gray-100 h-2 rounded w-3/4"></div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="bg-white/20 backdrop-blur-sm rounded-lg p-2">
                          <div className="flex items-center space-x-2">
                            <Smartphone size={12} className="text-white" />
                            <div className="bg-white/30 h-1 rounded flex-1"></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <p className="text-gray-600 mt-6 text-sm">
                  Available for iOS and Android
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AppSection;