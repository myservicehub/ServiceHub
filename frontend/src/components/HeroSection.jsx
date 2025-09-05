import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Search, MapPin } from 'lucide-react';
import { jobsAPI } from '../api/services';
import { useToast } from '../hooks/use-toast';

const HeroSection = () => {
  const [job, setJob] = useState('');
  const [location, setLocation] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const { toast } = useToast();

  const handleSearch = async (e) => {
    e.preventDefault();
    
    if (!job.trim()) {
      toast({
        title: "Search required",
        description: "Please enter what job you need doing.",
        variant: "destructive",
      });
      return;
    }

    if (!location.trim()) {
      toast({
        title: "Location required", 
        description: "Please enter your location.",
        variant: "destructive",
      });
      return;
    }

    setIsSearching(true);
    
    try {
      // Search for existing jobs
      const results = await jobsAPI.searchJobs({
        q: job,
        location: location,
        limit: 10
      });

      console.log('Search results:', results);

      // For now, just show a success message
      // In a real app, you'd navigate to a search results page
      toast({
        title: "Search completed!",
        description: `Found ${results.pagination?.total || 0} matching jobs in ${location}.`,
      });

      // Here you would typically navigate to search results page
      // navigate(`/search?q=${encodeURIComponent(job)}&location=${encodeURIComponent(location)}`);
      
    } catch (error) {
      console.error('Search error:', error);
      toast({
        title: "Search failed",
        description: "There was an error searching for jobs. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <section className="bg-gradient-to-br from-green-50 to-orange-50 py-16 lg:py-24">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl lg:text-6xl font-bold text-gray-900 mb-6">
            The reliable way to hire a{' '}
            <span className="text-green-600">tradesperson</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Post your job for free and connect with vetted, local tradespeople. 
            Read genuine reviews from homeowners like you.
          </p>

          {/* Search Form */}
          <form onSubmit={handleSearch} className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <Input
                  type="text"
                  placeholder="What job do you need doing?"
                  value={job}
                  onChange={(e) => setJob(e.target.value)}
                  className="pl-10 h-12 text-lg"
                />
              </div>
              <div className="flex-1 relative">
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <Input
                  type="text"
                  placeholder="Where are you based?"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="pl-10 h-12 text-lg"
                />
              </div>
              <Button 
                type="submit" 
                disabled={isSearching}
                className="bg-orange-500 hover:bg-orange-600 text-white h-12 px-8 text-lg font-semibold disabled:opacity-50"
              >
                {isSearching ? 'Searching...' : 'Find tradespeople'}
              </Button>
            </div>
          </form>

          <p className="text-gray-500 text-sm">
            Posting is free and only takes a couple of minutes
          </p>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;