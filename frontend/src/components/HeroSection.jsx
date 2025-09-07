import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Search, MapPin, Plus, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { jobsAPI } from '../api/services';
import { useToast } from '../hooks/use-toast';

// Nigerian Trade Categories
const NIGERIAN_TRADE_CATEGORIES = [
  "Building",
  "Concrete Works", 
  "Tiling",
  "CCTV & Security Systems",
  "Door & Window Installation",
  "Air Conditioning & Refrigeration",
  "Renovations",
  "Relocation/Moving",
  "Painting",
  "Carpentry",
  "General Handyman Work",
  "Bathroom Fitting",
  "Generator Services",
  "Home Extensions",
  "Scaffolding",
  "Waste Disposal",
  "Flooring",
  "Plastering/POP",
  "Cleaning",
  "Electrical Repairs",
  "Solar & Inverter Installation",
  "Plumbing",
  "Welding",
  "Furniture Making",
  "Interior Design",
  "Roofing",
  "Locksmithing",
  "Recycling"
];

// Nigerian States
const NIGERIAN_STATES = [
  "Abuja",
  "Lagos", 
  "Delta",
  "Rivers State",
  "Benin",
  "Bayelsa",
  "Enugu",
  "Cross Rivers"
];

const HeroSection = () => {
  const [job, setJob] = useState('');
  const [location, setLocation] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [showJobDropdown, setShowJobDropdown] = useState(false);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleJobSelect = (selectedJob) => {
    setJob(selectedJob);
    setShowJobDropdown(false);
  };

  const handleLocationSelect = (selectedLocation) => {
    setLocation(selectedLocation);
    setShowLocationDropdown(false);
  };

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
    <section className="py-16 lg:py-24" style={{background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)'}}>
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl lg:text-6xl font-bold font-montserrat mb-6" style={{color: '#121E3C'}}>
            The reliable way to hire a{' '}
            <span style={{color: '#2F8140'}}>tradesperson</span>
          </h1>
          <p className="text-xl text-gray-600 font-lato mb-8 max-w-2xl mx-auto">
            Post your job for free and connect with vetted, local tradespeople across Nigeria. 
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
                  className="pl-10 h-12 text-lg font-lato"
                />
              </div>
              <div className="flex-1 relative">
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <Input
                  type="text"
                  placeholder="Where are you based?"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="pl-10 h-12 text-lg font-lato"
                />
              </div>
              <Button 
                type="submit" 
                disabled={isSearching}
                className="text-white h-12 px-8 text-lg font-semibold font-lato disabled:opacity-50 hover:opacity-90"
                style={{backgroundColor: '#121E3C'}}
              >
                {isSearching ? 'Searching...' : 'Find tradespeople'}
              </Button>
            </div>
          </form>

          <p className="text-gray-500 text-sm font-lato mb-6">
            Posting is free and only takes a couple of minutes
          </p>

          {/* Alternative CTA */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button 
              onClick={() => navigate('/post-job')}
              className="text-white px-8 py-3 text-lg font-lato font-semibold hover:opacity-90"
              style={{backgroundColor: '#2F8140'}}
            >
              <Plus size={20} className="mr-2" />
              Post a Job Now
            </Button>
            <span className="text-gray-500 font-lato">or use the search above to find existing jobs</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;