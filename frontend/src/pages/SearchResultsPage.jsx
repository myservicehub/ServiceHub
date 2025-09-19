import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Search, MapPin, Clock, DollarSign, Star, ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/button';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { jobsAPI } from '../api/services';
import { useToast } from '../hooks/use-toast';

const SearchResultsPage = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useState({});
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const query = urlParams.get('q') || '';
    const locationParam = urlParams.get('location') || '';
    
    setSearchParams({ query, location: locationParam });
    
    if (query || locationParam) {
      searchJobs(query, locationParam);
    } else {
      setLoading(false);
    }
  }, [location.search]);

  const searchJobs = async (query, locationParam) => {
    try {
      setLoading(true);
      const response = await jobsAPI.searchJobs({
        q: query,
        location: locationParam
      });
      
      setJobs(response.jobs || []);
    } catch (error) {
      console.error('Search error:', error);
      toast({
        title: "Search failed",
        description: "There was an error searching for jobs. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatBudget = (budget) => {
    if (!budget) return 'Budget not specified';
    return `₦${budget.toLocaleString()}`;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const getUrgencyColor = (urgency) => {
    switch (urgency) {
      case 'urgent':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'high':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default:
        return 'text-green-600 bg-green-50 border-green-200';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => navigate('/')}
          className="mb-6 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft size={20} className="mr-2" />
          Back to Home
        </Button>

        {/* Search Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <h1 className="text-3xl font-bold font-montserrat mb-4" style={{color: '#121E3C'}}>
            Search Results
          </h1>
          
          {searchParams.query || searchParams.location ? (
            <div className="flex flex-wrap gap-4 text-gray-600">
              {searchParams.query && (
                <div className="flex items-center">
                  <Search size={18} className="mr-2" />
                  <span>Searching for: <strong>{searchParams.query}</strong></span>
                </div>
              )}
              {searchParams.location && (
                <div className="flex items-center">
                  <MapPin size={18} className="mr-2" />
                  <span>Location: <strong>{searchParams.location}</strong></span>
                </div>
              )}
            </div>
          ) : (
            <p className="text-gray-600">No search parameters provided</p>
          )}
          
          <div className="mt-4 text-sm text-gray-500">
            {loading ? 'Searching...' : `Found ${jobs.length} job${jobs.length !== 1 ? 's' : ''}`}
          </div>
        </div>

        {/* Results */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Searching for jobs...</p>
          </div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-12">
            <div className="bg-white rounded-lg shadow-sm p-12">
              <Search size={48} className="mx-auto mb-4 text-gray-400" />
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">No jobs found</h2>
              <p className="text-gray-600 mb-6">
                We couldn't find any jobs matching your search criteria.
              </p>
              <div className="space-y-2 text-sm text-gray-500">
                <p>Try:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Using different keywords</li>
                  <li>Checking your spelling</li>
                  <li>Using more general terms</li>
                  <li>Expanding your search location</li>
                </ul>
              </div>
              <Button
                onClick={() => navigate('/')}
                className="mt-6"
                style={{backgroundColor: '#2F8140'}}
              >
                Start New Search
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid gap-6">
            {jobs.map((job) => (
              <div key={job.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold font-montserrat mb-2" style={{color: '#121E3C'}}>
                      {job.title}
                    </h3>
                    <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-3">
                      <div className="flex items-center">
                        <MapPin size={16} className="mr-1" />
                        {job.location}
                      </div>
                      <div className="flex items-center">
                        <Clock size={16} className="mr-1" />
                        Posted {formatDate(job.created_at)}
                      </div>
                      <div className="flex items-center">
                        <DollarSign size={16} className="mr-1" />
                        {formatBudget(job.budget)}
                      </div>
                    </div>
                    
                    {/* Category Badge */}
                    <div className="inline-block">
                      <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded">
                        {job.category}
                      </span>
                    </div>
                    
                    {/* Urgency Badge */}
                    {job.urgency && (
                      <div className="inline-block ml-2">
                        <span className={`text-xs font-medium px-2.5 py-0.5 rounded border ${getUrgencyColor(job.urgency)}`}>
                          {job.urgency.charAt(0).toUpperCase() + job.urgency.slice(1)} Priority
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <p className="text-gray-700 mb-4 line-clamp-3">
                  {job.description || 'No description provided.'}
                </p>

                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-500">
                    Posted by {job.homeowner_name || 'Homeowner'}
                  </div>
                  
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => navigate(`/jobs/${job.id}`)}
                      className="text-gray-700 border-gray-300 hover:bg-gray-50"
                    >
                      View Details
                    </Button>
                    <Button
                      onClick={() => navigate(`/jobs/${job.id}/apply`)}
                      style={{backgroundColor: '#2F8140'}}
                      className="text-white hover:opacity-90"
                    >
                      Apply Now
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* No Results CTA */}
        {!loading && jobs.length === 0 && (
          <div className="text-center mt-12">
            <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-8">
              <h3 className="text-xl font-semibold mb-4" style={{color: '#121E3C'}}>
                Can't find what you're looking for?
              </h3>
              <p className="text-gray-600 mb-6">
                Post your own job and let qualified tradespeople come to you!
              </p>
              <Button
                onClick={() => navigate('/post-job')}
                style={{backgroundColor: '#2F8140'}}
                className="text-white px-8 py-3 text-lg font-semibold"
              >
                Post a Job Now
              </Button>
            </div>
          </div>
        )}
      </div>
      
      <Footer />
    </div>
  );
};

export default SearchResultsPage;