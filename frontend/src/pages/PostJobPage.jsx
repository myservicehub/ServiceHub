import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import JobPostingForm from '../components/JobPostingForm';
import { CheckCircle, Users, Clock, Star, AlertCircle, Shield, Award } from 'lucide-react';
import { Button } from '../components/ui/button';
import { useAuth } from '../contexts/AuthContext';
import Header from '../components/Header';
import Footer from '../components/Footer';

const PostJobPage = () => {
  const [isJobPosted, setIsJobPosted] = useState(false);
  const [postedJob, setPostedJob] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const initialCategory = location?.state?.initialCategory || null;
  const initialState = location?.state?.initialState || null;
  const { user, isAuthenticated } = useAuth();
  
  // Check if we're inside the dashboard layout
  const isInDashboard = location.pathname.startsWith('/dashboard');

  const handleJobComplete = (jobData) => {
    setPostedJob(jobData);
    setIsJobPosted(true);
  };

  if (isJobPosted) {
    return (
      <>
        {!isInDashboard && <Header />}
        <main className={isInDashboard ? "" : "min-h-screen bg-gray-50"}>
          <section 
            className={isInDashboard ? "py-8" : "py-16 lg:py-20"}
            style={!isInDashboard ? {
              backgroundImage: `linear-gradient(rgba(255,255,255,0.97), rgba(255,255,255,0.97)), 
                linear-gradient(90deg, rgba(0,0,0,0.03) 1px, transparent 1px),
                linear-gradient(rgba(0,0,0,0.03) 1px, transparent 1px)`,
              backgroundSize: '100% 100%, 20px 20px, 20px 20px'
            } : {}}
          >
            <div className={isInDashboard ? "" : "container mx-auto px-6 md:px-8 lg:px-12"}>
              <div className="max-w-lg mx-auto text-center">
                <div className="w-16 h-16 rounded-2xl bg-[#34D164] flex items-center justify-center mx-auto mb-5">
                  <CheckCircle size={32} className="text-white" />
                </div>
                
                <h1 className="text-2xl font-bold font-montserrat text-[#121E3C] mb-3">
                  Job Posted Successfully!
                </h1>
                
                <p className="text-gray-500 font-lato text-sm mb-8">
                  Your job "{postedJob?.title}" has been posted. You'll start receiving quotes soon!
                </p>

                <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-8 text-left">
                  <h3 className="font-semibold font-montserrat text-[#121E3C] mb-4 text-sm">What happens next?</h3>
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
                          <p className="text-sm font-medium font-lato text-[#121E3C]">{item.title}</p>
                          <p className="text-xs text-gray-400 font-lato mt-0.5">{item.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <Button 
                  onClick={() => navigate(isInDashboard ? '/dashboard' : '/')}
                  className="bg-[#34D164] hover:bg-[#2ab854] text-white px-8 py-2.5 text-sm font-medium rounded-full transition-all duration-300"
                >
                  {isInDashboard ? 'Back to Dashboard' : 'Back to Home'}
                </Button>
                <p className="text-xs text-gray-400 font-lato mt-3">
                  We'll email you when tradespeople start responding.
                </p>
              </div>
            </div>
          </section>
        </main>
        {!isInDashboard && <Footer />}
      </>
    );
  }

  // Gate: homeowners must verify email
  if (isAuthenticated() && user?.role === 'homeowner' && !user?.email_verified) {
    return (
      <>
        {!isInDashboard && <Header />}
        <main className={isInDashboard ? "" : "min-h-screen bg-gray-50"}>
          <section 
            className={isInDashboard ? "py-8" : "py-20"}
            style={!isInDashboard ? {
              backgroundImage: `linear-gradient(rgba(255,255,255,0.97), rgba(255,255,255,0.97)), 
                linear-gradient(90deg, rgba(0,0,0,0.03) 1px, transparent 1px),
                linear-gradient(rgba(0,0,0,0.03) 1px, transparent 1px)`,
              backgroundSize: '100% 100%, 20px 20px, 20px 20px'
            } : {}}
          >
            <div className={isInDashboard ? "" : "container mx-auto px-6 md:px-8 lg:px-12"}>
              <div className="max-w-md mx-auto text-center">
                <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto mb-5">
                  <AlertCircle size={32} className="text-amber-500" />
                </div>
                <h1 className="text-2xl font-bold font-montserrat text-[#121E3C] mb-3">Verification Required</h1>
                <p className="text-gray-500 font-lato text-sm mb-6">Please verify your email to post a job.</p>
                <Button 
                  onClick={() => navigate('/verify-account')} 
                  className="bg-[#34D164] hover:bg-[#2ab854] text-white px-8 py-2.5 text-sm font-medium rounded-full"
                >
                  Go to Verification
                </Button>
              </div>
            </div>
          </section>
        </main>
        {!isInDashboard && <Footer />}
      </>
    );
  }

  // For dashboard, render a simplified version without hero
  if (isInDashboard) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold font-montserrat text-[#121E3C]">Post a Job</h1>
            <p className="text-gray-500 font-lato text-sm mt-1">Tell us what you need done and get quotes from qualified tradespeople</p>
          </div>
        </div>
        <JobPostingForm onJobPosted={handleJobComplete} initialCategory={initialCategory} initialState={initialState} />
      </div>
    );
  }

  return (
    <>
      <Header />
      <main className="min-h-screen">
        {/* Hero Section */}
        <section className="relative py-12 lg:py-14 overflow-hidden">
          <div className="absolute inset-0">
            <img 
              src="/stock/bg4.jpg" 
              alt="" 
              className="w-full h-full object-cover"
              loading="eager"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-[#121E3C]/85 via-[#121E3C]/75 to-[#121E3C]/85" />
          </div>
          
          <div className="container relative z-10 mx-auto px-6 md:px-8 lg:px-12">
            <div className="max-w-2xl mx-auto text-center">
              <h1 className="text-2xl sm:text-3xl font-bold font-montserrat text-white mb-3">
                Post a Job
              </h1>
              <p className="text-white/70 font-lato text-sm max-w-md mx-auto">
                Tell us what you need done and get quotes from qualified tradespeople
              </p>
              
              {/* Stats */}
              <div className="flex justify-center gap-8 mt-8">
                {[
                  { icon: Users, label: 'Multiple Quotes' },
                  { icon: Shield, label: 'Verified Pros' },
                  { icon: Award, label: 'Quality Work' }
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-white/10 backdrop-blur-sm rounded-lg flex items-center justify-center">
                      <item.icon size={14} className="text-[#34D164]" />
                    </div>
                    <span className="text-white/80 text-xs font-lato">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Form Section */}
        <section 
          className="py-10 lg:py-12"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.97), rgba(255,255,255,0.97)), 
              linear-gradient(90deg, rgba(0,0,0,0.03) 1px, transparent 1px),
              linear-gradient(rgba(0,0,0,0.03) 1px, transparent 1px)`,
            backgroundSize: '100% 100%, 20px 20px, 20px 20px'
          }}
        >
          <div className="container mx-auto px-6 md:px-8 lg:px-12">
            {/* Job Posting Form */}
            <JobPostingForm onJobPosted={handleJobComplete} initialCategory={initialCategory} initialState={initialState} />
          </div>
        </section>

        {/* Trust Indicators */}
        <section className="relative py-12 overflow-hidden">
          <div className="absolute inset-0 bg-[#121E3C]" />
          
          <div className="container relative z-10 mx-auto px-6 md:px-8 lg:px-12">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-base font-semibold font-montserrat text-white text-center mb-6">Why Choose ServiceHub?</h2>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-center">
                {[
                  { value: '100+', label: 'Verified Tradespeople' },
                  { value: '15+', label: 'Trade Categories' },
                  { value: '200+', label: 'Happy Customers' },
                  { value: '4.8★', label: 'Average Rating' },
                ].map((stat) => (
                  <div key={stat.label} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4">
                    <div className="text-xl font-bold font-montserrat text-[#34D164]">{stat.value}</div>
                    <div className="text-[10px] text-white/60 font-lato mt-1">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
};

export default PostJobPage;







