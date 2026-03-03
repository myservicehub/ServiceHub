import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Quote, ExternalLink } from 'lucide-react';

const ReviewsSection = () => {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Mock testimonial data
  const testimonials = [
    {
      id: 1,
      name: 'Sarah Johnson',
      role: 'Homeowner',
      location: 'Lagos',
      avatar: '/stock/bg6.jpg',
      quote: "Finding a reliable plumber used to be a nightmare. ServiceHub changed everything - within hours I had three qualified professionals to choose from. The quality of work was exceptional.",
    },
    {
      id: 2,
      name: 'Michael Adeyemi',
      role: 'Property Manager',
      location: 'Abuja',
      avatar: '/stock/bg7.jpg',
      quote: "As a property manager handling multiple buildings, I need tradespeople I can trust. ServiceHub has become my go-to platform for all maintenance needs. Highly professional service.",
    },
    {
      id: 3,
      name: 'Chioma Okonkwo',
      role: 'Business Owner',
      location: 'Port Harcourt',
      avatar: '/stock/bg8.jpg',
      quote: "The electrician I found through ServiceHub completed our office rewiring project ahead of schedule. Transparent pricing, excellent communication, and outstanding results.",
    },
  ];

  const totalTestimonials = testimonials.length;

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? totalTestimonials - 1 : prev - 1));
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev === totalTestimonials - 1 ? 0 : prev + 1));
  };

  const currentTestimonial = testimonials[currentIndex];

  return (
    <section className="relative py-24 lg:py-32 bg-white overflow-hidden">
      {/* Subtle grid background */}
      <div 
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(#121E3C 1px, transparent 1px), linear-gradient(90deg, #121E3C 1px, transparent 1px)`,
          backgroundSize: '80px 80px'
        }}
      />

      <div className="container relative z-10 mx-auto px-6 md:px-8 lg:px-12">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-8 mb-16">
            {/* Left side - Label and heading */}
            <div className="lg:max-w-md">
              <div className="inline-flex items-center gap-2 mb-6">
                <span className="text-sm font-medium font-lato text-gray-500">Testimonials</span>
                <ExternalLink className="w-4 h-4 text-gray-400" />
              </div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold font-montserrat text-[#121E3C] leading-tight">
                This is what our<br />
                <span className="text-[#34D164]">clients</span> think about us
              </h2>
            </div>
          </div>

          {/* Testimonial Card */}
          <div className="max-w-4xl">
            <div className="relative bg-[#FAFAFA] rounded-2xl p-8 lg:p-12 shadow-sm border border-gray-100">
              {/* Counter */}
              <div className="flex items-center gap-1 mb-8">
                <span className="text-lg font-semibold font-montserrat text-[#121E3C]">
                  {String(currentIndex + 1).padStart(2, '0')}
                </span>
                <span className="text-lg text-gray-300 font-montserrat">/</span>
                <span className="text-lg text-gray-400 font-montserrat">
                  {String(totalTestimonials).padStart(2, '0')}
                </span>
              </div>

              {/* Quote */}
              <div className="flex gap-6 lg:gap-10">
                {/* Quote mark */}
                <div className="hidden sm:block flex-shrink-0">
                  <Quote className="w-10 h-10 text-[#121E3C] fill-current rotate-180" />
                </div>

                {/* Content */}
                <div className="flex-1">
                  <p className="text-xl lg:text-2xl font-medium font-montserrat text-[#121E3C] leading-relaxed mb-8">
                    "{currentTestimonial.quote}"
                  </p>

                  {/* Author */}
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gray-200 overflow-hidden">
                      <img 
                        src={currentTestimonial.avatar} 
                        alt={currentTestimonial.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <h4 className="font-semibold font-montserrat text-[#121E3C]">
                        {currentTestimonial.name}
                      </h4>
                      <p className="text-sm text-gray-500 font-lato">
                        {currentTestimonial.role} @ {currentTestimonial.location}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Navigation - Bottom left */}
              <div className="flex items-center gap-2 mt-8">
                <button
                  onClick={goToPrevious}
                  className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center text-gray-400 hover:border-[#34D164] hover:text-[#34D164] transition-colors duration-200"
                  aria-label="Previous testimonial"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={goToNext}
                  className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center text-gray-400 hover:border-[#34D164] hover:text-[#34D164] hover:bg-[#34D164]/5 transition-colors duration-200"
                  aria-label="Next testimonial"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ReviewsSection;



