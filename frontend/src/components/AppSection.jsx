import React from 'react';
import { Button } from './ui/button';
import { Camera, MessageCircle, Star } from 'lucide-react';

// App coming soon image source: supports remote URL via REACT_APP_COMING_SOON_IMAGE_URL
// and falls back to the local public asset at /coming-soon.jpg
const COMING_SOON_IMAGE_SRC =
  process.env.REACT_APP_COMING_SOON_IMAGE_URL || `${process.env.PUBLIC_URL || ''}/coming-soon.jpg`;

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
                Our App Coming Soon
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
              <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-3xl p-4 sm:p-6 md:p-8 text-center">
                <img
                  src={COMING_SOON_IMAGE_SRC}
                  alt="ServiceHub app coming soon teaser"
                  loading="lazy"
                  className="w-full max-w-lg mx-auto h-64 sm:h-80 md:h-[28rem] object-contain rounded-2xl shadow-xl"
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
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
