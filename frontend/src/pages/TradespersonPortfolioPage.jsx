import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { 
  User, 
  MapPin, 
  Star, 
  Award, 
  Briefcase, 
  Phone,
  Mail,
  Calendar,
  Building2,
  ArrowLeft
} from 'lucide-react';
import { portfolioAPI, authAPI } from '../api/services';
import { useToast } from '../hooks/use-toast';
import PortfolioGallery from '../components/portfolio/PortfolioGallery';
import { useNavigate } from 'react-router-dom';

const TradespersonPortfolioPage = () => {
  const { tradespersonId } = useParams();
  const [tradesperson, setTradesperson] = useState(null);
  const [portfolioItems, setPortfolioItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [portfolioLoading, setPortfolioLoading] = useState(false);
  
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (tradespersonId) {
      loadTradespersonData();
      loadPortfolio();
    }
  }, [tradespersonId]);

  const loadTradespersonData = async () => {
    try {
      // For now, we'll get basic tradesperson info from a user endpoint
      // In a full implementation, you might want a specific tradesperson profile endpoint
      const response = await authAPI.getCurrentUser(); // This is a placeholder
      setTradesperson(response);
    } catch (error) {
      console.error('Failed to load tradesperson data:', error);
      toast({
        title: "Failed to load profile",
        description: "There was an error loading the tradesperson profile.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadPortfolio = async () => {
    try {
      setPortfolioLoading(true);
      const response = await portfolioAPI.getTradespersonPortfolio(tradespersonId);
      setPortfolioItems(response.items || []);
    } catch (error) {
      console.error('Failed to load portfolio:', error);
      toast({
        title: "Failed to load portfolio",
        description: "There was an error loading the portfolio items.",
        variant: "destructive",
      });
    } finally {
      setPortfolioLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not specified';
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-4xl mx-auto">
            <div className="animate-pulse space-y-6">
              <div className="h-8 bg-gray-200 rounded w-1/3"></div>
              <Card>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="h-6 bg-gray-200 rounded w-1/2"></div>
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                  </div>
                </CardContent>
              </Card>
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
      
      {/* Back Navigation */}
      <section className="py-4 bg-white border-b">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <Button
              variant="ghost"
              onClick={() => navigate(-1)}
              className="font-lato"
            >
              <ArrowLeft size={16} className="mr-2" />
              Back
            </Button>
          </div>
        </div>
      </section>

      {/* Tradesperson Profile Header */}
      <section className="py-8 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-start space-x-6">
                  {/* Avatar Placeholder */}
                  <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center">
                    <User size={40} className="text-gray-400" />
                  </div>
                  
                  {/* Profile Info */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <h1 className="text-2xl font-bold font-montserrat mb-2" style={{color: '#121E3C'}}>
                          {tradesperson?.name || 'Tradesperson Name'}
                        </h1>
                        
                        {tradesperson?.company_name && (
                          <div className="flex items-center text-gray-600 font-lato mb-2">
                            <Building2 size={16} className="mr-2" />
                            {tradesperson.company_name}
                          </div>
                        )}
                        
                        <div className="flex items-center text-gray-600 font-lato mb-2">
                          <MapPin size={16} className="mr-2" />
                          {tradesperson?.location || 'Location not specified'}
                        </div>
                        
                        <div className="flex items-center space-x-4 mb-3">
                          <div className="flex items-center">
                            <Star size={16} className="text-yellow-400 fill-current mr-1" />
                            <span className="font-semibold" style={{color: '#2F8140'}}>
                              {tradesperson?.average_rating?.toFixed(1) || '0.0'}
                            </span>
                            <span className="text-gray-600 ml-1">
                              ({tradesperson?.total_reviews || 0} reviews)
                            </span>
                          </div>
                          
                          <div className="flex items-center text-gray-600">
                            <Briefcase size={16} className="mr-1" />
                            <span>{tradesperson?.total_jobs || 0} jobs completed</span>
                          </div>
                        </div>
                        
                        {/* Trade Categories */}
                        {tradesperson?.trade_categories && (
                          <div className="flex flex-wrap gap-2 mb-3">
                            {tradesperson.trade_categories.map((category, index) => (
                              <Badge key={index} variant="outline" className="text-sm">
                                {category}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      {/* Contact Button */}
                      <Button
                        className="text-white font-lato"
                        style={{backgroundColor: '#2F8140'}}
                      >
                        Contact Tradesperson
                      </Button>
                    </div>
                    
                    {/* Description */}
                    {tradesperson?.description && (
                      <div className="mt-4 pt-4 border-t">
                        <h3 className="font-semibold font-montserrat mb-2" style={{color: '#121E3C'}}>
                          About
                        </h3>
                        <p className="text-gray-700 font-lato">
                          {tradesperson.description}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Portfolio Section */}
      <section className="py-8">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center font-montserrat" style={{color: '#121E3C'}}>
                  <Award size={20} className="mr-2" style={{color: '#2F8140'}} />
                  Portfolio ({portfolioItems.length} items)
                </CardTitle>
              </CardHeader>
              
              <CardContent>
                <PortfolioGallery
                  items={portfolioItems}
                  isOwner={false}
                  loading={portfolioLoading}
                  emptyMessage="No portfolio items to display"
                  emptyDescription="This tradesperson hasn't added any portfolio items yet."
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Professional Details */}
      {tradesperson && (
        <section className="py-8">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Experience & Certifications */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center font-montserrat" style={{color: '#121E3C'}}>
                      <Award size={20} className="mr-2" style={{color: '#2F8140'}} />
                      Professional Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="font-semibold font-montserrat mb-2" style={{color: '#121E3C'}}>
                        Experience
                      </h4>
                      <p className="text-gray-700 font-lato">
                        {tradesperson.experience_years || 0} years of professional experience
                      </p>
                    </div>
                    
                    {tradesperson.certifications && tradesperson.certifications.length > 0 && (
                      <div>
                        <h4 className="font-semibold font-montserrat mb-2" style={{color: '#121E3C'}}>
                          Certifications
                        </h4>
                        <div className="space-y-2">
                          {tradesperson.certifications.map((cert, index) => (
                            <div key={index} className="flex items-center space-x-2">
                              <Award size={14} style={{color: '#2F8140'}} />
                              <span className="text-gray-700 font-lato">{cert}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Account Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center font-montserrat" style={{color: '#121E3C'}}>
                      <User size={20} className="mr-2" style={{color: '#2F8140'}} />
                      Account Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between py-2 border-b">
                        <div className="flex items-center space-x-2">
                          <Calendar size={16} style={{color: '#2F8140'}} />
                          <span className="font-lato">Member since</span>
                        </div>
                        <span className="text-gray-600 font-lato">
                          {formatDate(tradesperson.created_at)}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between py-2 border-b">
                        <div className="flex items-center space-x-2">
                          <Award size={16} style={{color: '#2F8140'}} />
                          <span className="font-lato">Verified Tradesperson</span>
                        </div>
                        <Badge className={tradesperson.verified_tradesperson ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                          {tradesperson.verified_tradesperson ? 'Verified' : 'Pending'}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>
      )}

      <Footer />
    </div>
  );
};

export default TradespersonPortfolioPage;