import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import JobPostingForm from '../components/JobPostingForm';
import { Card, CardContent } from '../components/ui/card';
import { CheckCircle, ArrowRight, Users, Clock, Star, AlertCircle } from 'lucide-react';
import { Button } from '../components/ui/button';
import { useAuth } from '../contexts/AuthContext';

const PostJobPage = () => {
  const [isJobPosted, setIsJobPosted] = useState(false);
  const [postedJob, setPostedJob] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const initialCategory = location?.state?.initialCategory || null;
  const initialState = location?.state?.initialState || null;
  const { user, isAuthenticated } = useAuth();

  const handleJobComplete = (jobData) => {
    setPostedJob(jobData);
    setIsJobPosted(true);
  };

  const benefits = [
    {
      icon: Users,
      title: 'Get Multiple Quotes',
      description: 'Receive quotes from multiple qualified tradespeople to compare prices and services.'
    },
    {
      icon: Clock,
      title: 'Save Time',
      description: 'No need to search for tradespeople. They come to you with competitive quotes.'
    },
    {
      icon: Star,
      title: 'Verified Reviews',
      description: 'Read genuine reviews from other homeowners to make informed decisions.'
    }
  ];

  if (isJobPosted) {
    return (
      <div className="max-w-2xl mx-auto py-8">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#34D164] flex items-center justify-center mx-auto mb-5">
            <CheckCircle size={32} className="text-white" />
          </div>
          
          <h1 className="text-2xl sm:text-3xl font-bold text-[#121E3C] mb-3">
            Job Posted Successfully!
          </h1>
          
          <p className="text-gray-500 mb-8">
            Your job "{postedJob?.title}" has been posted. You'll start receiving quotes soon!
          </p>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-8 text-left">
            <h3 className="font-semibold text-[#121E3C] mb-4">What happens next?</h3>
            <div className="space-y-4">
              {[
                { step: '1', title: 'Tradespeople will review your job', desc: 'Qualified professionals in your area will see your job posting.' },
                { step: '2', title: "You'll receive quotes", desc: 'Interested tradespeople will send you detailed quotes via email and phone.' },
                { step: '3', title: 'Compare and choose', desc: 'Review profiles, ratings, and quotes to select the best tradesperson.' },
              ].map((item) => (
                <div key={item.step} className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-[#34D164] flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5">
                    {item.step}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#121E3C]">{item.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Button 
            onClick={() => navigate('/')}
            className="bg-[#34D164] hover:bg-[#2FBD59] text-white px-8 shadow-md shadow-[#34D164]/20"
          >
            Back to Home
          </Button>
          <p className="text-xs text-gray-400 mt-3">
            We'll email you when tradespeople start responding.
          </p>
        </div>
      </div>
    );
  }

  // Gate: homeowners must verify email
  if (isAuthenticated() && user?.role === 'homeowner' && !user?.email_verified) {
    return (
      <div className="max-w-md mx-auto py-16 text-center">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto mb-5">
          <AlertCircle size={32} className="text-amber-500" />
        </div>
        <h1 className="text-2xl font-bold text-[#121E3C] mb-3">Verification Required</h1>
        <p className="text-gray-500 text-sm mb-6">Please verify your email to post a job.</p>
        <Button onClick={() => navigate('/verify-account')} className="bg-[#34D164] hover:bg-[#2FBD59] text-white px-8">
          Go to Verification
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-[#121E3C]">
          Post a Job
        </h1>
        <p className="text-gray-500 mt-1 text-sm">
          Tell us what you need done and get quotes from qualified tradespeople.
        </p>
      </div>

      {/* Benefits Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {benefits.map((benefit, index) => {
          const IconComponent = benefit.icon;
          return (
            <div key={index} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-start gap-4">
              <div className="p-2.5 bg-[#34D164]/10 rounded-xl flex-shrink-0">
                <IconComponent size={20} className="text-[#34D164]" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[#121E3C] mb-0.5">{benefit.title}</h3>
                <p className="text-xs text-gray-400">{benefit.description}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Job Posting Form */}
      <JobPostingForm onJobPosted={handleJobComplete} initialCategory={initialCategory} initialState={initialState} />

      {/* Trust Indicators */}
      <div className="bg-[#121E3C] rounded-2xl p-4 sm:p-6">
        <h2 className="text-sm sm:text-base font-semibold text-white text-center mb-4 sm:mb-5">Why Choose ServiceHub?</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 text-center">
          {[
            { value: '100+', label: 'Verified Tradespeople' },
            { value: '15+', label: 'Trade Categories' },
            { value: '200+', label: 'Happy Customers' },
            { value: '4.8★', label: 'Average Rating' },
          ].map((stat) => (
            <div key={stat.label}>
              <div className="text-xl sm:text-2xl font-bold text-[#34D164]">{stat.value}</div>
              <div className="text-[10px] sm:text-xs text-white/60 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PostJobPage;







