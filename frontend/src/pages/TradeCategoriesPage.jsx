import React, { useState, useEffect } from 'react';
import { useSEO } from '../hooks/useSEO';
import { Search, Wrench, Users, Star, ArrowRight, CheckCircle, Building2, Snowflake, Pipette, Cog, Hammer, Paintbrush, Scissors, Sun, Home, Zap, Drill, Sofa, Shield, Droplets, PenTool, Layers, DoorOpen, Fence, Bath, Flame, Lock, Video, Bug, Truck, Leaf, Lightbulb, Brush } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import Header from '../components/Header';
import Footer from '../components/Footer';
import FinalCTA from '../components/FinalCTA';
import { statsAPI, authAPI } from '../api/services';

const TradeCategoriesPage = () => {
  useSEO({
    title: 'Trade Categories',
    description: 'Browse all trade categories on ServiceHub — electricians, plumbers, carpenters, painters, and 20+ other verified trades available across Nigeria.',
    canonical: '/trade-categories',
  });
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTradespeople, setActiveTradespeople] = useState(52);
  const [platformStats, setPlatformStats] = useState(null);
  const [categoryCountsBySlug, setCategoryCountsBySlug] = useState({});
  const [tradeCategories, setTradeCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);

    const fetchData = async () => {
      try {
        const stats = await statsAPI.getStats();
        if (mounted) {
          setPlatformStats(stats);
          const count = Number(stats.total_tradespeople ?? stats.totalTradespeople ?? 52);
          setActiveTradespeople(count);
        }
      } catch (err) {
        console.warn('Failed to fetch stats:', err);
      }

      try {
        // 1) Get effective categories (static + admin custom) for authoritative list
        const effective = await authAPI.getTradeCategories();
        const effectiveList = Array.isArray(effective?.categories) ? effective.categories : (Array.isArray(effective) ? effective : []);

        // 2) Get counts per category (from tradespeople aggregation)
        const categoriesData = await statsAPI.getCategories();
        const rawCategories = Array.isArray(categoriesData) ? categoriesData : (categoriesData?.categories || []);
        
        const toSlug = (str) => String(str || '')
          .toLowerCase()
          .replace(/&/g, '')
          .replace(/\//g, '-')
          .replace(/\s+/g, '-')
          .replace(/[^a-z0-9-]/g, '');

        const countsMap = {};
        rawCategories.forEach((c) => {
          const slug = toSlug(c.name || c.title);
          const n = Number(c.tradesperson_count ?? 0);
          if (slug) countsMap[slug] = n;
        });

        if (mounted) {
          setCategoryCountsBySlug(countsMap);
          
          // Hardcoded metadata (descriptions and icons)
          const metaData = {
            "Building": { description: "Professional building and construction services for residential and commercial projects", icon: Building2, popular: true },
            "Concrete Works": { description: "Concrete mixing, pouring, finishing, and repair services", icon: Layers, popular: false },
            "Tiling": { description: "Floor and wall tiling, ceramic, marble, and tile repair services", icon: Layers, popular: false },
            "Door & Window Installation": { description: "Door and window installation, repair, and replacement services", icon: DoorOpen, popular: false },
            "Air Conditioning & Refrigeration": { description: "AC installation, repair, and refrigeration system services", icon: Snowflake, popular: true },
            "Plumbing": { description: "Water system installation, repairs, pipe fitting, and drainage solutions", icon: Droplets, popular: true },
            "Home Extensions": { description: "Home extension and expansion construction services", icon: Home, popular: false },
            "Scaffolding": { description: "Scaffolding installation, rental, and safety services", icon: Fence, popular: false },
            "Flooring": { description: "Floor installation, repairs, hardwood, tiles, and carpet services", icon: Layers, popular: false },
            "Bathroom Fitting": { description: "Complete bathroom installations, fittings, and renovation services", icon: Bath, popular: false },
            "Generator Services": { description: "Generator installation, repair, maintenance, and sales services", icon: Cog, popular: true },
            "Welding": { description: "Metal welding, fabrication, and metalwork services", icon: Flame, popular: false },
            "Renovations": { description: "Home and office renovation and remodeling services", icon: Hammer, popular: true },
            "Painting": { description: "Interior and exterior painting, wall finishes, and decorative services", icon: Paintbrush, popular: true },
            "Carpentry": { description: "Custom woodwork, furniture repair, and wooden structure installations", icon: Drill, popular: true },
            "Interior Design": { description: "Professional interior design, decoration, and space planning services", icon: PenTool, popular: false },
            "Solar & Inverter Installation": { description: "Solar panel installation, inverter setup, and renewable energy solutions", icon: Sun, popular: true },
            "Locksmithing": { description: "Lock installation, repair, key cutting, and security services", icon: Lock, popular: false },
            "Roofing": { description: "Roof installation, repairs, guttering, and waterproofing services", icon: Home, popular: true },
            "Plastering/POP": { description: "Plastering, POP ceiling installation, and wall finishing services", icon: Brush, popular: false },
            "Furniture Making": { description: "Custom furniture design, manufacturing, and upholstery services", icon: Sofa, popular: false },
            "Electrical Repairs": { description: "Electrical installations, wiring, repairs, and maintenance services", icon: Zap, popular: true },
            "CCTV & Security Systems": { description: "CCTV installation, security system setup, and monitoring services", icon: Video, popular: false },
            "General Handyman Work": { description: "General repairs, maintenance, and small household fixes", icon: Wrench, popular: true },
            "Cleaning": { description: "Home and office cleaning, deep cleaning, and sanitation services", icon: Brush, popular: true },
            "Relocation/Moving": { description: "Local moving, packing, loading, and relocation logistics", icon: Truck, popular: false },
            "Waste Disposal": { description: "Waste collection, junk removal, and disposal services", icon: Truck, popular: false },
            "Recycling": { description: "Recyclables pickup, sorting, and eco-friendly material processing", icon: Leaf, popular: false },
            "Pest Control": { description: "Pest extermination, fumigation, and prevention services", icon: Bug, popular: false },
            "Landscaping": { description: "Garden design, lawn care, and outdoor landscaping services", icon: Leaf, popular: false }
          };

          // Build final category list strictly from the effective categories in DB
          const finalCategories = (effectiveList || []).map((name) => {
            const meta = metaData[name] || {};
            return {
              name,
              description: meta.description || `Professional ${name} services in Nigeria`,
              icon: meta.icon || Wrench,
              popular: !!meta.popular,
              tradesperson_count: countsMap[toSlug(name)] || 0
            };
          });
          finalCategories.sort((a, b) => a.name.localeCompare(b.name));
          setTradeCategories(finalCategories);
        }
      } catch (err) {
        console.warn('Failed to fetch categories:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchData();
    return () => { mounted = false; };
  }, []);

  // Convert category name to URL slug
  const categoryToSlug = (categoryName) => {
    return categoryName.toLowerCase()
      .replace(/&/g, '')
      .replace(/\//g, '-')
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');
  };

  // Handle category click
  const handleCategoryClick = (categoryName) => {
    const slug = categoryToSlug(categoryName);
    navigate(`/trade-categories/${slug}`);
  };

  // Get exact tradespeople count for a category (0 if none or missing)
  const getCategoryCount = (categoryName) => {
    const slug = categoryToSlug(categoryName);
    const n = categoryCountsBySlug[slug];
    return typeof n === 'number' ? n : 0;
  };

  // Filter categories based on search term
  const filteredCategories = tradeCategories.filter(category =>
    category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    category.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const popularCategories = tradeCategories.filter(category => category.popular);

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gray-50">
        {/* Hero Section */}
        <section className="relative pt-24 sm:pt-28 lg:pt-32 pb-16 lg:pb-20 overflow-hidden">
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
            <div className="max-w-3xl mx-auto text-center">
              <span className="inline-block px-4 py-1.5 mb-5 text-xs font-semibold font-lato tracking-wider uppercase text-[#34D164] bg-white/5 backdrop-blur-sm border border-white/10 rounded-full">
                {tradeCategories.length}+ Categories
              </span>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold font-montserrat text-white mb-4 leading-tight">
                Trade Categories
              </h1>
              <p className="text-white/70 font-lato mb-8 max-w-xl mx-auto">
                Discover skilled tradespeople across Nigeria for all your home and business needs
              </p>
              
              {/* Search Bar */}
              <div className="relative max-w-lg mx-auto mb-8">
                <div className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10">
                  <Search className="text-white/60" size={18} />
                </div>
                <Input
                  type="text"
                  placeholder="Search trade categories..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-11 py-3 text-sm font-lato bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-[#34D164] rounded-xl"
                />
              </div>
              
              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 max-w-md mx-auto">
                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4">
                  <div className="text-xl font-bold font-montserrat text-[#34D164]">
                    {tradeCategories.length}
                  </div>
                  <div className="text-xs text-white/60 font-lato">Categories</div>
                </div>
                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4">
                  <div className="text-xl font-bold font-montserrat text-white">
                    {activeTradespeople.toLocaleString()}+
                  </div>
                  <div className="text-xs text-white/60 font-lato">Tradespeople</div>
                </div>
                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4">
                  <div className="text-xl font-bold font-montserrat text-white">
                    {Number(platformStats?.total_states ?? 0)}
                  </div>
                  <div className="text-xs text-white/60 font-lato">States</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section 
          className="py-12 lg:py-16"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.97), rgba(255,255,255,0.97)), 
              linear-gradient(90deg, rgba(0,0,0,0.03) 1px, transparent 1px),
              linear-gradient(rgba(0,0,0,0.03) 1px, transparent 1px)`,
            backgroundSize: '100% 100%, 20px 20px, 20px 20px'
          }}
        >
          <div className="container mx-auto px-6 md:px-8 lg:px-12">
            <div className="max-w-6xl mx-auto">
              {/* Popular Categories Section */}
              {!searchTerm && (
                <div className="mb-12">
                  <h2 className="text-xl font-semibold font-montserrat mb-6 text-[#121E3C]">
                    Most Popular Categories
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {popularCategories.map((category, index) => (
                      <div 
                        key={index} 
                        onClick={() => handleCategoryClick(category.name)}
                        className="group bg-white rounded-2xl p-5 border border-gray-100 cursor-pointer hover:shadow-lg hover:border-[#34D164]/20 transition-all duration-300"
                      >
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 bg-[#34D164]/10 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300">
                            {category.icon && <category.icon size={22} className="text-[#34D164]" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold font-montserrat text-[#121E3C] truncate">
                                {category.name}
                              </h3>
                              <Star size={14} className="text-amber-400 shrink-0" fill="currentColor" />
                            </div>
                            <p className="text-gray-500 text-xs font-lato mb-3 line-clamp-2">
                              {category.description}
                            </p>
                            <div className="flex items-center justify-between">
                              <span className="text-[#34D164] font-medium text-xs">
                                {getCategoryCount(category.name).toLocaleString()} Tradespeople
                              </span>
                              <ArrowRight size={14} className="text-gray-300 group-hover:text-[#34D164] group-hover:translate-x-1 transition-all duration-300" />
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
                <h2 className="text-xl font-semibold font-montserrat mb-6 text-[#121E3C]">
                  {searchTerm ? `Search Results (${filteredCategories.length})` : 'All Trade Categories'}
                </h2>
                
                {filteredCategories.length === 0 ? (
                  <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
                    <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <Search size={24} className="text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-[#121E3C] mb-2">No categories found</h3>
                    <p className="text-gray-400 text-sm">Try searching with different keywords</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filteredCategories.map((category, index) => (
                      <div 
                        key={index} 
                        onClick={() => handleCategoryClick(category.name)}
                        className="group bg-white rounded-2xl p-5 border border-gray-100 cursor-pointer hover:shadow-lg hover:border-[#34D164]/20 transition-all duration-300"
                      >
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-[#34D164]/10 transition-colors duration-300">
                            {category.icon && <category.icon size={22} className="text-gray-500 group-hover:text-[#34D164] transition-colors duration-300" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold font-montserrat text-[#121E3C] truncate">
                                {category.name}
                              </h3>
                              {category.popular && (
                                <Star size={12} className="text-amber-400 shrink-0" fill="currentColor" />
                              )}
                            </div>
                            <p className="text-gray-500 text-xs font-lato mb-3 line-clamp-2">
                              {category.description}
                            </p>
                            <div className="flex items-center justify-between">
                              <span className="text-[#34D164] font-medium text-xs">
                                {getCategoryCount(category.name).toLocaleString()} Tradespeople
                              </span>
                              <ArrowRight size={14} className="text-gray-300 group-hover:text-[#34D164] group-hover:translate-x-1 transition-all duration-300" />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <FinalCTA 
          badge="Find professionals"
          title="Ready to get started?"
          subtitle="Post your job and connect with qualified professionals in your area."
          buttonText="Post a Job"
          buttonLink="/post-job"
          showAuthModal={false}
        />

      </div>
      <Footer />
    </>
  );
};

export default TradeCategoriesPage;
