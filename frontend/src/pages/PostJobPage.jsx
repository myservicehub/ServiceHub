import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import JobPostingForm from '../components/JobPostingForm';
import { Card, CardContent } from '../components/ui/card';
import { CheckCircle, ArrowRight, Users, Clock, Star } from 'lucide-react';
import { Button } from '../components/ui/button';

const PostJobPage = () => {
  const [isJobPosted, setIsJobPosted] = useState(false);
  const [postedJob, setPostedJob] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const initialCategory = location?.state?.initialCategory || null;
  const initialState = location?.state?.initialState || null;

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
      <div className="min-h-screen bg-gray-50">
        <Header />
        
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-2xl mx-auto text-center">
            <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6" 
                 style={{backgroundColor: '#34D164'}}>
              <CheckCircle size={40} className="text-white" />
            </div>
            
            <h1 className="text-3xl font-bold font-montserrat mb-4" style={{color: '#121E3C'}}>
              Job Posted Successfully!
            </h1>
            
            <p className="text-lg text-gray-600 font-lato mb-8">
              Your job "{postedJob?.title}" has been posted to our network of verified tradespeople. 
              You'll start receiving quotes soon!
            </p>

            <Card className="bg-white mb-8">
              <CardContent className="p-6">
                <h3 className="font-semibold font-montserrat mb-4" style={{color: '#121E3C'}}>
                  What happens next?
                </h3>
                <div className="space-y-4 text-left">
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-sm font-bold mt-1" 
                         style={{backgroundColor: '#34D164'}}>
                      1
                    </div>
                    <div>
                      <p className="font-medium font-lato">Tradespeople will review your job</p>
                      <p className="text-sm text-gray-600 font-lato">Qualified professionals in your area will see your job posting.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-sm font-bold mt-1" 
                         style={{backgroundColor: '#34D164'}}>
                      2
                    </div>
                    <div>
                      <p className="font-medium font-lato">You'll receive quotes</p>
                      <p className="text-sm text-gray-600 font-lato">Interested tradespeople will send you detailed quotes via email and phone.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-sm font-bold mt-1" 
                         style={{backgroundColor: '#34D164'}}>
                      3
                    </div>
                    <div>
                      <p className="font-medium font-lato">Compare and choose</p>
                      <p className="text-sm text-gray-600 font-lato">Review profiles, ratings, and quotes to select the best tradesperson for your job.</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <Button 
                onClick={() => navigate('/')}
                className="text-white font-lato px-8"
                style={{backgroundColor: '#34D164'}}
              >
                Back to Home
              </Button>
              
              <p className="text-sm text-gray-500 font-lato">
                We'll email you when tradespeople start responding to your job.
              </p>
            </div>
          </div>
        </div>
        
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      {/* Hero Section */}
      <section className="py-12" style={{background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)'}}>
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-3xl lg:text-4xl font-bold font-montserrat mb-4" style={{color: '#121E3C'}}>
              Post Your Job for Free
            </h1>
            <p className="text-xl text-gray-600 font-lato mb-8">
              Tell us what you need done and get quotes from qualified tradespeople in your area.
            </p>
            
            {/* Benefits */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {benefits.map((benefit, index) => {
                const IconComponent = benefit.icon;
                return (
                  <div key={index} className="bg-white p-6 rounded-lg shadow-sm">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4" 
                         style={{backgroundColor: '#34D164'}}>
                      <IconComponent size={24} className="text-white" />
                    </div>
                    <h3 className="font-semibold font-montserrat mb-2" style={{color: '#121E3C'}}>
                      {benefit.title}
                    </h3>
                    <p className="text-sm text-gray-600 font-lato">
                      {benefit.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Job Posting Form */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <JobPostingForm onJobPosted={handleJobComplete} initialCategory={initialCategory} initialState={initialState} />
        </div>
      </section>

      {/* Trust Indicators */}
      <section className="py-12 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold font-montserrat mb-4" style={{color: '#121E3C'}}>
                Why Choose serviceHub?
              </h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-center">
              <div>
                <div className="text-3xl font-bold font-montserrat" style={{color: '#34D164'}}>100+</div>
                <div className="text-sm text-gray-600 font-lato">Verified Tradespeople</div>
              </div>
              <div>
                <div className="text-3xl font-bold font-montserrat" style={{color: '#34D164'}}>15+</div>
                <div className="text-sm text-gray-600 font-lato">Trade Categories</div>
              </div>
              <div>
                <div className="text-3xl font-bold font-montserrat" style={{color: '#34D164'}}>200+</div>
                <div className="text-sm text-gray-600 font-lato">Happy Customers</div>
              </div>
              <div>
                <div className="text-3xl font-bold font-montserrat" style={{color: '#34D164'}}>4.8★</div>
                <div className="text-sm text-gray-600 font-lato">Average Rating</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default PostJobPage;







