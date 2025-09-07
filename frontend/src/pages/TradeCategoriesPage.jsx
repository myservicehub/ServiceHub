import React, { useState } from 'react';
import { Search, Wrench, Users, Star, ArrowRight, CheckCircle } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import Header from '../components/Header';
import Footer from '../components/Footer';

const TradeCategoriesPage = () => {
  const [searchTerm, setSearchTerm] = useState('');

  // Nigerian Trade Categories with descriptions and icons
  const tradeCategories = [
    {
      name: "Building",
      description: "Professional building and construction services for residential and commercial projects",
      icon: "🏗️",
      popular: true,
      serviceCount: "500+"
    },
    {
      name: "Plumbing",
      description: "Water system installation, repairs, pipe fitting, and drainage solutions",
      icon: "🔧",
      popular: true,
      serviceCount: "350+"
    },
    {
      name: "Electrical Repairs",
      description: "Electrical installations, wiring, repairs, and maintenance services",
      icon: "⚡",
      popular: true,
      serviceCount: "400+"
    },
    {
      name: "Painting",
      description: "Interior and exterior painting, wall finishes, and decorative services",
      icon: "🎨",
      popular: true,
      serviceCount: "300+"
    },
    {
      name: "Carpentry",
      description: "Custom woodwork, furniture repair, and wooden structure installations",
      icon: "🪚",
      popular: true,
      serviceCount: "250+"
    },
    {
      name: "Tiling",
      description: "Floor and wall tiling, ceramic, marble, and tile repair services",
      icon: "🧱",
      popular: false,
      serviceCount: "200+"
    },
    {
      name: "Concrete Works",
      description: "Concrete pouring, foundation work, driveways, and structural concrete",
      icon: "🏗️",
      popular: false,
      serviceCount: "180+"
    },
    {
      name: "CCTV & Security Systems",
      description: "Security cameras, alarm systems, and home security installations",
      icon: "📹",
      popular: false,
      serviceCount: "150+"
    },
    {
      name: "Door & Window Installation",
      description: "Door and window fitting, repairs, and security installations",
      icon: "🚪",
      popular: false,
      serviceCount: "160+"
    },
    {
      name: "Air Conditioning & Refrigeration",
      description: "AC installation, repair, and refrigeration system services",
      icon: "❄️",
      popular: true,
      serviceCount: "220+"
    },
    {
      name: "Renovations",
      description: "Complete home and office renovation and remodeling services",
      icon: "🏠",
      popular: true,
      serviceCount: "180+"
    },
    {
      name: "Relocation/Moving",
      description: "Professional moving services, packing, and relocation assistance",
      icon: "📦",
      popular: false,
      serviceCount: "120+"
    },
    {
      name: "General Handyman Work",
      description: "General repairs, maintenance, and small household fixes",
      icon: "🔨",
      popular: true,
      serviceCount: "300+"
    },
    {
      name: "Bathroom Fitting",
      description: "Complete bathroom installations, fittings, and renovation services",
      icon: "🛁",
      popular: false,
      serviceCount: "140+"
    },
    {
      name: "Generator Services",
      description: "Generator installation, repair, maintenance, and sales services",
      icon: "⚙️",
      popular: true,
      serviceCount: "200+"
    },
    {
      name: "Home Extensions",
      description: "House extensions, additional rooms, and structural additions",
      icon: "🏗️",
      popular: false,
      serviceCount: "90+"
    },
    {
      name: "Scaffolding",
      description: "Professional scaffolding services for construction and maintenance",
      icon: "🏗️",
      popular: false,
      serviceCount: "80+"
    },
    {
      name: "Waste Disposal",
      description: "Waste removal, debris clearing, and environmental cleaning services",
      icon: "🗑️",
      popular: false,
      serviceCount: "100+"
    },
    {
      name: "Flooring",
      description: "Floor installation, repairs, hardwood, tiles, and carpet services",
      icon: "🏠",
      popular: false,
      serviceCount: "170+"
    },
    {
      name: "Plastering/POP",
      description: "Wall plastering, POP ceiling installation, and finishing works",
      icon: "🧱",
      popular: false,
      serviceCount: "160+"
    },
    {
      name: "Cleaning",
      description: "Professional cleaning services for homes, offices, and commercial spaces",
      icon: "🧽",
      popular: true,
      serviceCount: "250+"
    },
    {
      name: "Solar & Inverter Installation",
      description: "Solar panel installation, inverter setup, and renewable energy solutions",
      icon: "☀️",
      popular: true,
      serviceCount: "130+"
    },
    {
      name: "Welding",
      description: "Metal welding, fabrication, and metalwork services",
      icon: "🔥",
      popular: false,
      serviceCount: "110+"
    },
    {
      name: "Furniture Making",
      description: "Custom furniture design, manufacturing, and upholstery services",
      icon: "🪑",
      popular: false,
      serviceCount: "140+"
    },
    {
      name: "Interior Design",
      description: "Professional interior design, decoration, and space planning services",
      icon: "🎨",
      popular: false,
      serviceCount: "90+"
    },
    {
      name: "Roofing",
      description: "Roof installation, repairs, guttering, and waterproofing services",
      icon: "🏠",
      popular: true,
      serviceCount: "190+"
    },
    {
      name: "Locksmithing",
      description: "Lock installation, repair, key cutting, and security services",
      icon: "🔐",
      popular: false,
      serviceCount: "80+"
    },
    {
      name: "Recycling",
      description: "Waste recycling, material recovery, and environmental services",
      icon: "♻️",
      popular: false,
      serviceCount: "50+"
    }
  ];

  // Filter categories based on search term
  const filteredCategories = tradeCategories.filter(category =>
    category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    category.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const popularCategories = tradeCategories.filter(category => category.popular);
  const totalTradespeople = tradeCategories.reduce((total, category) => {
    return total + parseInt(category.serviceCount.replace('+', ''));
  }, 0);

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gray-50">
      {/* Header Section */}
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl font-bold font-montserrat mb-4" style={{color: '#121E3C'}}>
              Trade Categories
            </h1>
            <p className="text-xl text-gray-600 font-lato mb-6">
              Discover skilled tradespeople across Nigeria for all your home and business needs
            </p>
            
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-green-50 rounded-lg p-6">
                <div className="text-3xl font-bold font-montserrat" style={{color: '#2F8140'}}>
                  {tradeCategories.length}
                </div>
                <div className="text-sm text-gray-600 font-lato">Trade Categories</div>
              </div>
              <div className="bg-blue-50 rounded-lg p-6">
                <div className="text-3xl font-bold font-montserrat text-blue-600">
                  {totalTradespeople.toLocaleString()}+
                </div>
                <div className="text-sm text-gray-600 font-lato">Active Tradespeople</div>
              </div>
              <div className="bg-purple-50 rounded-lg p-6">
                <div className="text-3xl font-bold font-montserrat text-purple-600">
                  8
                </div>
                <div className="text-sm text-gray-600 font-lato">States Covered</div>
              </div>
            </div>

            {/* Search Bar */}
            <div className="relative max-w-lg mx-auto">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <Input
                type="text"
                placeholder="Search trade categories..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 py-3 text-lg font-lato"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          {/* Popular Categories Section */}
          {!searchTerm && (
            <div className="mb-12">
              <h2 className="text-2xl font-bold font-montserrat mb-6" style={{color: '#121E3C'}}>
                Most Popular Categories
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {popularCategories.map((category, index) => (
                  <div key={index} className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow border border-gray-100">
                    <div className="flex items-start space-x-4">
                      <div className="text-3xl">{category.icon}</div>
                      <div className="flex-1">
                        <h3 className="font-semibold font-montserrat text-lg mb-2" style={{color: '#121E3C'}}>
                          {category.name}
                        </h3>
                        <p className="text-gray-600 text-sm font-lato mb-3">
                          {category.description}
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-green-600 font-semibold text-sm">
                            {category.serviceCount} Tradespeople
                          </span>
                          <div className="flex items-center text-yellow-500">
                            <Star size={16} fill="currentColor" />
                            <span className="text-sm ml-1">Popular</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* All Categories Section */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold font-montserrat mb-6" style={{color: '#121E3C'}}>
              {searchTerm ? `Search Results (${filteredCategories.length})` : 'All Trade Categories'}
            </h2>
            
            {filteredCategories.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-400 mb-4">
                  <Search size={48} className="mx-auto" />
                </div>
                <h3 className="text-xl font-semibold text-gray-600 mb-2">No categories found</h3>
                <p className="text-gray-500">Try searching with different keywords</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredCategories.map((category, index) => (
                  <div key={index} className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow border border-gray-100">
                    <div className="flex items-start space-x-4">
                      <div className="text-3xl">{category.icon}</div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-semibold font-montserrat text-lg" style={{color: '#121E3C'}}>
                            {category.name}
                          </h3>
                          {category.popular && (
                            <div className="flex items-center text-yellow-500">
                              <Star size={14} fill="currentColor" />
                            </div>
                          )}
                        </div>
                        <p className="text-gray-600 text-sm font-lato mb-3">
                          {category.description}
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-green-600 font-semibold text-sm">
                            {category.serviceCount} Available
                          </span>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="text-green-600 hover:text-green-700 p-1"
                          >
                            <ArrowRight size={16} />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* CTA Section */}
          <div className="bg-gradient-to-r from-green-600 to-blue-600 rounded-2xl p-8 text-white text-center">
            <h2 className="text-3xl font-bold font-montserrat mb-4">
              Ready to Find Your Perfect Tradesperson?
            </h2>
            <p className="text-xl font-lato mb-6 opacity-90">
              Post your job and connect with qualified professionals in your area
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                className="bg-white text-green-600 hover:bg-gray-100 px-8 py-3 text-lg font-semibold font-lato"
                onClick={() => window.location.href = '/post-job'}
              >
                Post a Job
              </Button>
              <Button 
                variant="outline" 
                className="border-white text-white hover:bg-white hover:text-green-600 px-8 py-3 text-lg font-semibold font-lato"
                onClick={() => window.location.href = '/browse-jobs'}
              >
                Browse Jobs
              </Button>
            </div>
          </div>

          {/* Benefits Section */}
          <div className="mt-12 bg-white rounded-2xl p-8 shadow-sm">
            <h2 className="text-2xl font-bold font-montserrat mb-6 text-center" style={{color: '#121E3C'}}>
              Why Choose ServiceHub?
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle size={32} style={{color: '#2F8140'}} />
                </div>
                <h3 className="font-semibold font-montserrat text-lg mb-2">Verified Professionals</h3>
                <p className="text-gray-600 font-lato">All tradespeople are verified and background-checked for your safety</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Star size={32} className="text-blue-600" />
                </div>
                <h3 className="font-semibold font-montserrat text-lg mb-2">Rated & Reviewed</h3>
                <p className="text-gray-600 font-lato">Read genuine reviews from real customers to make informed decisions</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users size={32} className="text-purple-600" />
                </div>
                <h3 className="font-semibold font-montserrat text-lg mb-2">Local Experts</h3>
                <p className="text-gray-600 font-lato">Connect with skilled professionals in your local area across Nigeria</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default TradeCategoriesPage;