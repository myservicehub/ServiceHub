import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, Clock, Star, MapPin, Phone, Mail, CheckCircle, AlertCircle, Info } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';

const TradeCategoryDetailPage = () => {
  const { categorySlug } = useParams();
  const navigate = useNavigate();
  const [category, setCategory] = useState(null);
  const [loading, setLoading] = useState(true);

  // Trade category data with detailed information
  const tradeCategories = {
    "building": {
      name: "Building",
      description: "Professional building and construction services for residential and commercial projects",
      services: [
        "New home construction",
        "Foundation laying",
        "Block laying and masonry",
        "Structural work",
        "Building repairs and maintenance",
        "Project management"
      ],
      averagePrice: "₦2,000,000 - ₦15,000,000",
      timeframe: "3-12 months",
      materials: ["Cement blocks", "Sand", "Cement", "Iron rods", "Roofing sheets", "PVC pipes"],
      whatToExpect: "Building contractors handle the complete construction process from foundation to roofing. They manage subcontractors, ensure quality control, and deliver projects on time.",
      whenToHire: "When planning new construction, major renovations, or structural repairs that require permits and professional oversight.",
      tips: [
        "Always verify building permits and approvals",
        "Check contractor's previous work and references",
        "Ensure proper insurance coverage",
        "Get detailed written quotes with material specifications",
        "Set clear payment milestones tied to completion stages"
      ],
      redFlags: [
        "Demands full payment upfront",
        "Cannot provide references or portfolio",
        "Lacks proper licenses or insurance",
        "Gives verbal quotes only",
        "Pressure tactics or door-to-door sales"
      ]
    },
    "plumbing": {
      name: "Plumbing",
      description: "Expert plumbing services for installation, repairs, and maintenance of water systems",
      services: [
        "Pipe installation and repair",
        "Bathroom and kitchen plumbing",
        "Water heater installation",
        "Drainage and sewage systems",
        "Leak detection and repair",
        "Emergency plumbing services"
      ],
      averagePrice: "₦5,000 - ₦200,000",
      timeframe: "1 hour - 3 days",
      materials: ["PVC pipes", "Copper pipes", "Fittings", "Valves", "Water meters", "Pumps"],
      whatToExpected: "Plumbers handle water supply, drainage, and sewage systems. They ensure proper installation, prevent leaks, and maintain water pressure throughout your property.",
      whenToHire: "For new installations, repairs, renovations, or when experiencing water pressure issues, leaks, or drainage problems.",
      tips: [
        "Check for proper licensing and certification",
        "Ask for warranty on parts and labor",
        "Get quotes for both materials and labor",
        "Ensure they carry liability insurance",
        "Request references from recent customers"
      ],
      redFlags: [
        "Shows up without proper tools",
        "Cannot explain the problem or solution",
        "Quotes seem unusually high or low",
        "Asks for full payment before starting",
        "No written estimate or contract"
      ]
    },
    "electrical-repairs": {
      name: "Electrical Repairs",
      description: "Professional electrical services for safe and reliable power systems",
      services: [
        "Wiring installation and repairs",
        "Light fixtures and fan installation",
        "Electrical panel upgrades",
        "Outlet and switch installation",
        "Electrical troubleshooting",
        "Safety inspections"
      ],
      averagePrice: "₦3,000 - ₦150,000",
      timeframe: "30 minutes - 2 days",
      materials: ["Electrical cables", "Switches", "Outlets", "Circuit breakers", "Conduits", "Light fixtures"],
      whatToExpect: "Electricians ensure safe and efficient electrical systems. They handle installations, repairs, and safety upgrades while following electrical codes.",
      whenToHire: "For new installations, electrical faults, power outages, flickering lights, or when adding new appliances requiring electrical work.",
      tips: [
        "Verify electrician is licensed and insured",
        "Turn off power at main breaker before work begins",
        "Ask about warranty on electrical work",
        "Get detailed written estimates",
        "Ensure all work meets local electrical codes"
      ],
      redFlags: [
        "Works without turning off power",
        "Cannot show proper credentials",
        "Uses substandard materials",
        "Doesn't follow safety protocols",
        "Quotes without inspecting the work area"
      ]
    },
    "painting": {
      name: "Painting",
      description: "Professional painting services for interior and exterior surfaces",
      services: [
        "Interior wall painting",
        "Exterior building painting",
        "Ceiling painting",
        "Wood staining and finishing",
        "Surface preparation",
        "Color consultation"
      ],
      averagePrice: "₦15,000 - ₦300,000",
      timeframe: "1-7 days",
      materials: ["Paint (emulsion, gloss, primer)", "Brushes", "Rollers", "Scrapers", "Drop cloths", "Sandpaper"],
      whatToExpect: "Painters prepare surfaces, apply primer when needed, and finish with quality paint. They protect furniture and ensure clean, professional results.",
      whenToHire: "For new construction, renovations, maintenance, or when walls show wear, stains, or you want to change colors.",
      tips: [
        "Discuss paint quality and brand preferences",
        "Ensure proper surface preparation",
        "Ask about primer and number of coats",
        "Protect furniture and belongings",
        "Check weather conditions for exterior work"
      ],
      redFlags: [
        "Skips surface preparation",
        "Uses low-quality paint without disclosure",
        "Cannot provide color samples",
        "Doesn't protect your property",
        "Rushes through the job"
      ]
    },
    "carpentry": {
      name: "Carpentry",
      description: "Skilled woodworking services for construction, furniture, and custom installations",
      services: [
        "Custom furniture making",
        "Kitchen cabinet installation",
        "Door and window frames",
        "Wooden flooring",
        "Shelving and storage",
        "Repairs and refinishing"
      ],
      averagePrice: "₦10,000 - ₦500,000",
      timeframe: "1 day - 4 weeks",
      materials: ["Hardwood", "Plywood", "MDF", "Screws", "Hinges", "Wood finish"],
      whatToExpect: "Carpenters work with wood to create functional and decorative items. They measure precisely, cut accurately, and join pieces with strong, lasting joints.",
      whenToHire: "For custom furniture, built-in storage, repairs to wooden items, or when you need wooden installations that fit specific spaces.",
      tips: [
        "Review portfolio of previous work",
        "Discuss wood types and quality",
        "Ask about warranty on craftsmanship",
        "Get detailed measurements and specifications",
        "Understand the timeline for custom work"
      ],
      redFlags: [
        "Cannot show examples of similar work",
        "Doesn't take proper measurements",
        "Uses poor quality materials",
        "Cannot explain joinery techniques",
        "Lacks proper woodworking tools"
      ]
    },
    "tiling": {
      name: "Tiling",
      description: "Expert tile installation for floors, walls, and decorative surfaces",
      services: [
        "Floor tile installation",
        "Wall tile installation",
        "Bathroom and kitchen tiling",
        "Tile repairs and replacement",
        "Grouting and sealing",
        "Pattern and design layouts"
      ],
      averagePrice: "₦8,000 - ₦250,000",
      timeframe: "1-5 days",
      materials: ["Ceramic tiles", "Porcelain tiles", "Adhesive", "Grout", "Spacers", "Sealers"],
      whatToExpect: "Tilers prepare surfaces, plan layouts, cut tiles to fit, and ensure level installation with proper spacing and grouting.",
      whenToHire: "For new installations, renovations, or when replacing damaged tiles in bathrooms, kitchens, or living areas.",
      tips: [
        "Choose tiles before getting quotes",
        "Ensure proper surface preparation", 
        "Discuss waterproofing for wet areas",
        "Ask about tile wastage calculations",
        "Check tile alignment and spacing"
      ],
      redFlags: [
        "Doesn't check surface level",
        "Uses wrong adhesive for tile type",
        "Poor spacing or alignment",
        "Rushes the grouting process",
        "Cannot cut tiles properly"
      ]
    },
    "roofing": {
      name: "Roofing",
      description: "Professional roofing services for installation, repairs, and maintenance",
      services: [
        "New roof installation",
        "Roof repairs and maintenance",
        "Gutter installation",
        "Leak detection and repair",
        "Roof inspections",
        "Emergency repairs"
      ],
      averagePrice: "₦100,000 - ₦2,000,000",
      timeframe: "1-10 days",
      materials: ["Roofing sheets", "Purlins", "Screws", "Gutters", "Flashing", "Insulation"],
      whatToExpect: "Roofers handle all aspects of roof work from installation to maintenance. They ensure water-tight seals and proper drainage.",
      whenToHire: "For new construction, roof damage, leaks, maintenance, or when planning to upgrade your roofing system.",
      tips: [
        "Check credentials and insurance",
        "Get written warranties on materials and labor",
        "Understand local building codes",
        "Ask about disposal of old materials",
        "Schedule work during dry season"
      ],
      redFlags: [
        "Works during rainy season without protection",
        "Cannot provide proper safety equipment",
        "Quotes without roof inspection",
        "Uses substandard materials",
        "No warranty offered"
      ]
    },
    "cleaning": {
      name: "Cleaning",
      description: "Professional cleaning services for homes, offices, and commercial spaces",
      services: [
        "Regular house cleaning",
        "Deep cleaning services",
        "Office cleaning",
        "Post-construction cleanup",
        "Carpet and upholstery cleaning",
        "Window cleaning"
      ],
      averagePrice: "₦5,000 - ₦50,000",
      timeframe: "2 hours - 2 days",
      materials: ["Cleaning chemicals", "Microfiber cloths", "Vacuum cleaners", "Mops", "Brushes", "Protective equipment"],
      whatToExpect: "Professional cleaners use proper techniques and equipment to thoroughly clean spaces while respecting your property and belongings.",
      whenToHire: "For regular maintenance, deep cleaning, move-in/out cleaning, post-renovation cleanup, or special events.",
      tips: [
        "Discuss cleaning supplies and chemicals used",
        "Secure valuable items before cleaning",
        "Specify areas requiring special attention",
        "Ask about insurance coverage",
        "Establish cleaning schedules and routines"
      ],
      redFlags: [
        "Doesn't bring proper cleaning supplies",
        "Cannot provide references",
        "No insurance or bonding",
        "Rushes through the cleaning",
        "Damages property without accountability"
      ]
    },
    "generator-services": {
      name: "Generator Services",
      description: "Generator installation, maintenance, and repair services for reliable power backup",
      services: [
        "Generator installation",
        "Routine maintenance",
        "Repair services",
        "Load testing",
        "Fuel system maintenance",
        "Emergency call-outs"
      ],
      averagePrice: "₦15,000 - ₦300,000",
      timeframe: "2 hours - 3 days",
      materials: ["Generator parts", "Oil", "Filters", "Spark plugs", "Fuel lines", "Batteries"],
      whatToExpect: "Generator technicians ensure your backup power system operates reliably when needed. They perform regular maintenance and emergency repairs.",
      whenToHire: "For new generator installation, regular maintenance, troubleshooting power issues, or emergency repairs during outages.",
      tips: [
        "Schedule regular maintenance",
        "Keep maintenance records",
        "Ask about genuine parts availability",
        "Understand warranty terms",
        "Learn basic operation and safety"
      ],
      redFlags: [
        "Uses non-genuine parts without disclosure",
        "Skips safety procedures",
        "Cannot diagnose problems properly",
        "No maintenance schedule provided",
        "Leaves job site messy"
      ]
    },
    "air-conditioning-refrigeration": {
      name: "Air Conditioning & Refrigeration",
      description: "Professional HVAC services for cooling and refrigeration systems",
      services: [
        "AC installation and setup",
        "AC repairs and maintenance",
        "Refrigerator repairs",
        "System diagnostics",
        "Gas refilling",
        "Electrical component replacement"
      ],
      averagePrice: "₦8,000 - ₦200,000",
      timeframe: "1 hour - 2 days",
      materials: ["Refrigerant gas", "Compressors", "Thermostats", "Filters", "Electrical components", "Pipes"],
      whatToExpect: "HVAC technicians diagnose cooling issues, perform repairs, and ensure optimal performance of your cooling systems.",
      whenToHire: "When AC or refrigerator isn't cooling properly, making noise, or for routine maintenance and new installations.",
      tips: [
        "Check technician's certification",
        "Ask about refrigerant types used",
        "Understand warranty on repairs",
        "Schedule regular maintenance",
        "Keep area clean for technician access"
      ],
      redFlags: [
        "Cannot identify refrigerant types",
        "Works without proper safety equipment",
        "Quotes without proper diagnosis",
        "Uses recycled parts without disclosure",
        "No understanding of electrical systems"
      ]
    }
  };

  useEffect(() => {
    const categoryData = tradeCategories[categorySlug];
    if (categoryData) {
      setCategory(categoryData);
    }
    setLoading(false);
  }, [categorySlug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3 mb-8"></div>
              <div className="space-y-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-4 bg-gray-200 rounded w-full"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!category) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Trade Category Not Found</h1>
            <p className="text-gray-600 mb-8">The trade category you're looking for doesn't exist.</p>
            <button
              onClick={() => navigate('/trade-categories')}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium"
            >
              View All Categories
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Back Button */}
          <button
            onClick={() => navigate('/trade-categories')}
            className="flex items-center text-green-600 hover:text-green-700 mb-6 font-medium"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to All Categories
          </button>

          {/* Header */}
          <div className="bg-white rounded-lg shadow-sm border p-8 mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">{category.name}</h1>
            <p className="text-xl text-gray-600 mb-6">{category.description}</p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex items-center">
                <Clock className="w-5 h-5 text-green-600 mr-3" />
                <div>
                  <p className="font-semibold text-gray-900">Typical Duration</p>
                  <p className="text-gray-600">{category.timeframe}</p>
                </div>
              </div>
              <div className="flex items-center">
                <Star className="w-5 h-5 text-green-600 mr-3" />
                <div>
                  <p className="font-semibold text-gray-900">Price Range</p>
                  <p className="text-gray-600">{category.averagePrice}</p>
                </div>
              </div>
              <div className="flex items-center">
                <Users className="w-5 h-5 text-green-600 mr-3" />
                <div>
                  <p className="font-semibold text-gray-900">Find Professionals</p>
                  <button
                    onClick={() => navigate(`/browse-jobs?category=${encodeURIComponent(category.name)}`)}
                    className="text-green-600 hover:text-green-700 font-medium"
                  >
                    Browse Jobs →
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Services Offered */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Services Offered</h2>
              <ul className="space-y-3">
                {category.services.map((service, index) => (
                  <li key={index} className="flex items-start">
                    <CheckCircle className="w-5 h-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">{service}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Common Materials */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Common Materials Used</h2>
              <div className="grid grid-cols-2 gap-3">
                {category.materials.map((material, index) => (
                  <div key={index} className="flex items-center">
                    <div className="w-2 h-2 bg-green-600 rounded-full mr-3"></div>
                    <span className="text-gray-700">{material}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* What to Expect */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">What to Expect</h2>
              <p className="text-gray-700 leading-relaxed">{category.whatToExpect}</p>
            </div>

            {/* When to Hire */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">When to Hire</h2>
              <p className="text-gray-700 leading-relaxed">{category.whenToHire}</p>
            </div>
          </div>

          {/* Tips and Red Flags */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
            {/* Hiring Tips */}
            <div className="bg-green-50 rounded-lg border border-green-200 p-6">
              <div className="flex items-center mb-4">
                <Info className="w-6 h-6 text-green-600 mr-3" />
                <h2 className="text-2xl font-semibold text-green-900">Hiring Tips</h2>
              </div>
              <ul className="space-y-3">
                {category.tips.map((tip, index) => (
                  <li key={index} className="flex items-start">
                    <CheckCircle className="w-4 h-4 text-green-600 mr-3 mt-1 flex-shrink-0" />
                    <span className="text-green-800">{tip}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Red Flags */}
            <div className="bg-red-50 rounded-lg border border-red-200 p-6">
              <div className="flex items-center mb-4">
                <AlertCircle className="w-6 h-6 text-red-600 mr-3" />
                <h2 className="text-2xl font-semibold text-red-900">Red Flags to Avoid</h2>
              </div>
              <ul className="space-y-3">
                {category.redFlags.map((flag, index) => (
                  <li key={index} className="flex items-start">
                    <AlertCircle className="w-4 h-4 text-red-600 mr-3 mt-1 flex-shrink-0" />
                    <span className="text-red-800">{flag}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Call to Action */}
          <div className="bg-white rounded-lg shadow-sm border p-8 mt-8 text-center">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              Ready to find {category.name} professionals?
            </h2>
            <p className="text-gray-600 mb-6">
              Post your job for free and get quotes from verified {category.name.toLowerCase()} experts in your area.
            </p>
            <div className="space-x-4">
              <button
                onClick={() => navigate('/post-job')}
                className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg font-medium"
              >
                Post a Job
              </button>
              <button
                onClick={() => navigate(`/browse-jobs?category=${encodeURIComponent(category.name)}`)}
                className="border border-green-600 text-green-600 hover:bg-green-50 px-8 py-3 rounded-lg font-medium"
              >
                Find Professionals
              </button>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default TradeCategoryDetailPage;