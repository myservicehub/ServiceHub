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
    "concrete-works": {
      name: "Concrete Works",
      description: "Professional concrete services for foundations, floors, and structural elements",
      services: [
        "Foundation concrete pouring",
        "Floor slab construction", 
        "Concrete repairs",
        "Stamped concrete",
        "Concrete finishing",
        "Reinforcement installation"
      ],
      averagePrice: "₦50,000 - ₦800,000",
      timeframe: "1-7 days",
      materials: ["Cement", "Sand", "Granite", "Water", "Steel reinforcement", "Admixtures"],
      whatToExpect: "Concrete workers handle mixing, pouring, and finishing concrete for various applications. They ensure proper curing and strength development.",
      whenToHire: "For foundations, floor slabs, driveways, or any structural concrete work in construction projects.",
      tips: [
        "Check concrete mix specifications",
        "Ensure proper reinforcement placement",
        "Plan for weather conditions",
        "Understand curing requirements",
        "Verify equipment and tools availability"
      ],
      redFlags: [
        "Uses incorrect concrete mix ratios",
        "Ignores weather conditions",
        "Doesn't understand reinforcement requirements",
        "Rushes the curing process",
        "Lacks proper finishing tools"
      ]
    },
    "cctv-security-systems": {
      name: "CCTV & Security Systems",
      description: "Professional security system installation and monitoring solutions",
      services: [
        "CCTV camera installation",
        "Access control systems",
        "Alarm system setup",
        "Security system maintenance",
        "Remote monitoring setup",
        "Integration with mobile apps"
      ],
      averagePrice: "₦30,000 - ₦500,000",
      timeframe: "1-3 days",
      materials: ["CCTV cameras", "DVR/NVR systems", "Cables", "Monitors", "Hard drives", "Power supplies"],
      whatToExpect: "Security technicians install and configure surveillance systems, ensuring optimal coverage and reliable recording. They provide training on system operation.",
      whenToHire: "When enhancing property security, installing new surveillance, or upgrading existing security systems.",
      tips: [
        "Plan camera placement for optimal coverage",
        "Discuss storage and recording options",
        "Ensure network compatibility",
        "Ask about mobile app access",
        "Understand maintenance requirements"
      ],
      redFlags: [
        "Cannot explain system capabilities",
        "Uses low-quality equipment",
        "Poor cable management",
        "No system testing or demonstration",
        "Inadequate training provided"
      ]
    },
    "door-window-installation": {
      name: "Door & Window Installation",
      description: "Professional installation and repair of doors, windows, and frames",
      services: [
        "Door installation and replacement",
        "Window installation",
        "Frame repairs",
        "Hardware installation", 
        "Weatherproofing",
        "Security door installation"
      ],
      averagePrice: "₦15,000 - ₦200,000",
      timeframe: "4 hours - 2 days",
      materials: ["Doors", "Windows", "Frames", "Hinges", "Locks", "Sealants"],
      whatToExpect: "Installation specialists ensure proper fitting, alignment, and sealing of doors and windows. They handle hardware and weatherproofing.",
      whenToHire: "For new installations, replacements, repairs, or security upgrades to doors and windows.",
      tips: [
        "Measure openings accurately",
        "Choose appropriate materials for climate",
        "Ensure proper weatherproofing",
        "Check hardware quality",
        "Verify security features"
      ],
      redFlags: [
        "Doesn't measure openings properly",
        "Uses poor quality hardware",
        "Ignores weatherproofing requirements",
        "Cannot adjust for alignment issues",
        "Leaves gaps or poor sealing"
      ]
    },
    "renovations": {
      name: "Renovations", 
      description: "Complete renovation services for homes and commercial spaces",
      services: [
        "Kitchen renovations",
        "Bathroom remodeling",
        "Room additions",
        "Interior renovations",
        "Exterior renovations",
        "Project coordination"
      ],
      averagePrice: "₦200,000 - ₦5,000,000",
      timeframe: "2 weeks - 6 months",
      materials: ["Varies by project", "Tiles", "Paint", "Fixtures", "Flooring", "Lighting"],
      whatToExpect: "Renovation contractors manage complete remodeling projects, coordinating multiple trades and ensuring quality results within timeline and budget.",
      whenToHire: "When updating spaces, increasing property value, or improving functionality of existing areas.",
      tips: [
        "Define scope and budget clearly",
        "Get detailed project timeline",
        "Understand permit requirements",
        "Plan for temporary disruptions",
        "Set realistic expectations"
      ],
      redFlags: [
        "Vague project scope or timeline",
        "No written contract",
        "Demands large upfront payments",
        "Cannot provide renovation portfolio",
        "Doesn't discuss permits"
      ]
    },
    "relocation-moving": {
      name: "Relocation/Moving",
      description: "Professional moving and relocation services for homes and offices",
      services: [
        "Residential moving",
        "Office relocations",
        "Packing services",
        "Loading and unloading",
        "Furniture assembly",
        "Storage solutions"
      ],
      averagePrice: "₦20,000 - ₦200,000",
      timeframe: "4 hours - 2 days",
      materials: ["Moving boxes", "Packing materials", "Moving truck", "Dollies", "Straps", "Protective covers"],
      whatToExpected: "Moving professionals handle packing, loading, transportation, and unloading of belongings with care and efficiency.",
      whenToHire: "When relocating homes or offices, need professional packing, or require specialized moving equipment.",
      tips: [
        "Get written estimates from multiple movers",
        "Verify insurance coverage",
        "Inventory valuable items",
        "Pack essentials separately",
        "Confirm moving date and timeline"
      ],
      redFlags: [
        "No insurance or bonding",
        "Extremely low estimates",
        "Demands cash payment only",
        "No written contract",
        "Cannot provide references"
      ]
    },
    "general-handyman-work": {
      name: "General Handyman Work",
      description: "Multi-skilled professionals for various home maintenance and repair tasks",
      services: [
        "Small repairs and fixes",
        "Assembly services",
        "Basic maintenance",
        "Minor installations",
        "Patch work",
        "Odd jobs"
      ],
      averagePrice: "₦5,000 - ₦50,000",
      timeframe: "2 hours - 1 day",
      materials: ["Basic tools", "Fasteners", "Adhesives", "Small parts", "Touch-up paint", "Sealants"],
      whatToExpect: "Handymen handle various small tasks and repairs around the home, providing convenient multi-service support.",
      whenToHire: "For multiple small tasks, minor repairs, assembly work, or maintenance that doesn't require specialized trades.",
      tips: [
        "List all tasks before getting quote",
        "Verify tools and materials needed",
        "Set priorities for task completion",
        "Check references for quality work",
        "Discuss any safety concerns"
      ],
      redFlags: [
        "Lacks basic tools",
        "Cannot handle multiple task types",
        "No understanding of safety practices",
        "Quotes without seeing all tasks",
        "Leaves tasks incomplete"
      ]
    },
    "bathroom-fitting": {
      name: "Bathroom Fitting",
      description: "Complete bathroom installation and renovation services",
      services: [
        "Bathroom suite installation",
        "Shower installation",
        "Toilet installation",
        "Basin and vanity fitting",
        "Tiling and waterproofing",
        "Plumbing connections"
      ],
      averagePrice: "₦100,000 - ₦800,000", 
      timeframe: "3-10 days",
      materials: ["Bathroom suites", "Tiles", "Waterproof membranes", "Plumbing fittings", "Sealants", "Fixtures"],
      whatToExpect: "Bathroom fitters handle complete installation from plumbing to finishing, ensuring waterproofing and functionality.",
      whenToHire: "For new bathroom installations, complete renovations, or major bathroom upgrades.",
      tips: [
        "Plan layout and design first",
        "Ensure proper waterproofing",
        "Choose quality fixtures",
        "Verify plumbing compatibility",
        "Consider ventilation requirements"
      ],
      redFlags: [
        "Ignores waterproofing requirements",
        "Poor quality fixtures or materials",
        "Cannot handle plumbing connections",
        "Doesn't follow building codes",
        "Rushes installation process"
      ]
    },
    "solar-inverter-installation": {
      name: "Solar & Inverter Installation",
      description: "Professional solar power and inverter system installation and maintenance",
      services: [
        "Solar panel installation",
        "Inverter system setup",
        "Battery installation",
        "System commissioning",
        "Maintenance services",
        "Performance monitoring"
      ],
      averagePrice: "₦200,000 - ₦2,000,000",
      timeframe: "1-5 days",
      materials: ["Solar panels", "Inverters", "Batteries", "Charge controllers", "Cables", "Mounting systems"],
      whatToExpect: "Solar technicians design and install renewable energy systems, ensuring optimal performance and safety compliance.",
      whenToHire: "When installing backup power, reducing electricity costs, or implementing renewable energy solutions.",
      tips: [
        "Assess energy needs accurately",
        "Understand system components",
        "Check warranty terms",
        "Verify installer certifications",
        "Plan for maintenance requirements"
      ],
      redFlags: [
        "Cannot size system properly",
        "Uses substandard components",
        "Poor installation practices",
        "No safety certifications",
        "Inadequate system documentation"
      ]
    },
    "welding": {
      name: "Welding",
      description: "Professional welding services for metal fabrication and repairs",
      services: [
        "Steel fabrication",
        "Repair welding",
        "Gate and railing installation",
        "Structural welding",
        "Decorative metalwork",
        "Emergency repairs"
      ],
      averagePrice: "₦10,000 - ₦300,000",
      timeframe: "2 hours - 1 week",
      materials: ["Welding rods", "Steel", "Gas", "Safety equipment", "Grinding discs", "Paint"],
      whatToExpect: "Welders join metals using various techniques, creating strong and durable connections for structural and decorative purposes.",
      whenToHire: "For metal fabrication, repairs, installations, or custom metalwork projects.",
      tips: [
        "Verify welding certifications",
        "Discuss material specifications",
        "Ensure proper safety measures",
        "Check previous welding work",
        "Understand finishing requirements"
      ],
      redFlags: [
        "No welding certifications",
        "Ignores safety protocols",
        "Poor quality welds",
        "Uses inappropriate materials",
        "Cannot read technical drawings"
      ]
    },
    "furniture-making": {
      name: "Furniture Making",
      description: "Custom furniture design and manufacturing services",
      services: [
        "Custom furniture design",
        "Kitchen cabinets",
        "Wardrobes and closets",
        "Office furniture",
        "Repairs and restoration",
        "Upholstery work"
      ],
      averagePrice: "₦50,000 - ₦1,000,000",
      timeframe: "1-8 weeks",
      materials: ["Hardwood", "Plywood", "Hardware", "Finishes", "Upholstery materials", "Adhesives"],
      whatToExpect: "Furniture makers create custom pieces tailored to specific requirements, combining craftsmanship with functionality.",
      whenToHire: "For custom furniture needs, built-in storage, or specialized pieces not available commercially.",
      tips: [
        "Review portfolio and samples",
        "Discuss wood types and quality",
        "Understand construction methods",
        "Set realistic timeframes",
        "Clarify warranty and aftercare"
      ],
      redFlags: [
        "Cannot show quality examples",
        "Uses poor materials",
        "Unrealistic promises or timelines",
        "No understanding of joinery",
        "Lacks proper workshop facilities"
      ]
    },
    "interior-design": {
      name: "Interior Design",
      description: "Professional interior design and space planning services",
      services: [
        "Space planning",
        "Color consultation",
        "Furniture selection",
        "Lighting design",
        "Project management",
        "Styling and decoration"
      ],
      averagePrice: "₦100,000 - ₦2,000,000",
      timeframe: "2-12 weeks",
      materials: ["Design materials", "Furniture", "Lighting", "Textiles", "Accessories", "Art"],
      whatToExpect: "Interior designers create functional and aesthetic spaces through careful planning, selection, and coordination of design elements.",
      whenToHire: "When planning room makeovers, new construction interiors, or need professional design guidance.",
      tips: [
        "Review designer's portfolio",
        "Discuss budget and timeline",
        "Understand design process",
        "Clarify purchasing arrangements",
        "Set clear communication expectations"
      ],
      redFlags: [
        "No portfolio or credentials",
        "Cannot work within budget",
        "Poor communication skills",
        "Doesn't understand client needs",
        "No project management experience"
      ]
    },
    "locksmithing": {
      name: "Locksmithing", 
      description: "Professional lock installation, repair, and security services",
      services: [
        "Lock installation and repair",
        "Key cutting and duplication",
        "Emergency lockout service",
        "Security system integration",
        "Safe installation",
        "Master key systems"
      ],
      averagePrice: "₦5,000 - ₦100,000",
      timeframe: "30 minutes - 1 day",
      materials: ["Locks", "Keys", "Security hardware", "Tools", "Lubricants", "Installation materials"],
      whatToExpect: "Locksmiths provide security solutions through lock installation, repair, and emergency services with professional expertise.",
      whenToHire: "For lock installations, repairs, emergencies, security upgrades, or key management needs.",
      tips: [
        "Verify locksmith credentials",
        "Get written estimates",
        "Ask about warranty on locks",
        "Ensure 24/7 availability if needed",
        "Check insurance coverage"
      ],
      redFlags: [
        "Cannot provide proper identification",
        "Excessive charges for simple tasks",
        "Damages locks unnecessarily",
        "No emergency service availability",
        "Cannot handle modern lock systems"
      ]
    },
    "recycling": {
      name: "Recycling",
      description: "Waste management and recycling services for various materials",
      services: [
        "Material collection",
        "Sorting and processing",
        "Electronics recycling",
        "Metal recycling",
        "Paper and cardboard recycling",
        "Consultation services"
      ],
      averagePrice: "₦5,000 - ₦50,000",
      timeframe: "1-3 hours",
      materials: ["Collection containers", "Transportation", "Processing equipment", "Safety gear", "Documentation", "Certifications"],
      whatToExpect: "Recycling professionals collect, sort, and process recyclable materials according to environmental standards and regulations.",
      whenToHire: "For large-scale waste disposal, specialized recycling needs, or environmental compliance requirements.",
      tips: [
        "Understand what materials are accepted",
        "Check environmental certifications",
        "Discuss pickup schedules",
        "Verify proper disposal methods",
        "Ask about documentation provided"
      ],
      redFlags: [
        "No environmental certifications",
        "Cannot handle specialized materials",
        "Poor sorting practices",
        "No documentation provided",
        "Environmentally harmful practices"
      ]
    },
    "home-extensions": {
      name: "Home Extensions",
      description: "Professional home extension and addition services",
      services: [
        "Room additions",
        "Second story additions",
        "Kitchen extensions",
        "Garage conversions",
        "Porch and patio extensions",
        "Structural modifications"
      ],
      averagePrice: "₦500,000 - ₦5,000,000",
      timeframe: "4-20 weeks",
      materials: ["Structural materials", "Roofing", "Windows", "Doors", "Insulation", "Finishing materials"],
      whatToExpect: "Extension specialists handle planning, permits, construction, and finishing of home additions that integrate seamlessly with existing structures.",
      whenToHire: "When needing more space, increasing home value, or adapting home layout to changing needs.",
      tips: [
        "Check planning permission requirements",
        "Ensure structural integrity assessment",
        "Match existing architectural style",
        "Plan utilities and services integration",
        "Set realistic timeline expectations"
      ],
      redFlags: [
        "Doesn't understand building regulations",
        "Cannot provide structural calculations",
        "Poor integration with existing structure",
        "No permits or approvals",
        "Unrealistic cost estimates"
      ]
    },
    "scaffolding": {
      name: "Scaffolding",
      description: "Professional scaffolding erection and rental services for construction projects",
      services: [
        "Scaffolding erection",
        "Scaffolding dismantling",
        "Safety inspections",
        "Equipment rental",
        "Custom scaffolding solutions",
        "Training and consultation"
      ],
      averagePrice: "₦20,000 - ₦200,000",
      timeframe: "1-3 days",
      materials: ["Scaffolding poles", "Couplers", "Boards", "Base plates", "Safety equipment", "Ties"],
      whatToExpect: "Scaffolding professionals provide safe, stable platforms for construction work, ensuring compliance with safety regulations.",
      whenToHire: "For construction, maintenance, or repair work at height requiring safe access platforms.",
      tips: [
        "Verify safety certifications",
        "Ensure proper ground conditions",
        "Check inspection schedules",
        "Understand rental terms",
        "Confirm load capacity requirements"
      ],
      redFlags: [
        "No safety certifications",
        "Uses damaged equipment",
        "Inadequate foundation preparation",
        "No inspection documentation",
        "Ignores safety regulations"
      ]
    },
    "waste-disposal": {
      name: "Waste Disposal",
      description: "Professional waste collection and disposal services",
      services: [
        "Construction waste removal",
        "Household waste collection",
        "Hazardous waste disposal",
        "Bulk item removal",
        "Recycling services",
        "Skip hire services"
      ],
      averagePrice: "₦10,000 - ₦100,000",
      timeframe: "1-3 hours",
      materials: ["Collection vehicles", "Containers", "Safety equipment", "Disposal documentation", "Protective gear", "Sorting equipment"],
      whatToExpect: "Waste disposal professionals collect, transport, and dispose of various waste types according to environmental regulations.",
      whenToHire: "For large cleanouts, construction waste, hazardous materials, or regular waste collection services.",
      tips: [
        "Understand what waste types are accepted",
        "Check environmental compliance",
        "Verify proper disposal methods",
        "Get documentation for hazardous waste",
        "Compare pricing and service levels"
      ],
      redFlags: [
        "No proper licenses for waste handling",
        "Illegal dumping practices",
        "Cannot handle hazardous materials",
        "No documentation provided",
        "Damages property during collection"
      ]
    },
    "flooring": {
      name: "Flooring",
      description: "Professional flooring installation and repair services",
      services: [
        "Tile flooring installation",
        "Wooden floor installation",
        "Vinyl and laminate flooring",
        "Floor repairs and restoration",
        "Subfloor preparation",
        "Floor finishing and sealing"
      ],
      averagePrice: "₦15,000 - ₦400,000",
      timeframe: "1-7 days",
      materials: ["Flooring materials", "Adhesives", "Underlayment", "Trims", "Sealers", "Tools"],
      whatToExpect: "Flooring specialists prepare surfaces and install various flooring types with precision, ensuring durability and aesthetics.",
      whenToHire: "For new flooring installation, replacements, repairs, or when updating room aesthetics.",
      tips: [
        "Choose appropriate flooring for room use",
        "Ensure proper subfloor preparation",
        "Discuss acclimatization requirements",
        "Plan for furniture removal",
        "Understand maintenance requirements"
      ],
      redFlags: [
        "Skips subfloor preparation",
        "Uses inappropriate materials",
        "Poor pattern alignment",
        "Inadequate expansion gaps",
        "No finishing or sealing"
      ]
    },
    "plastering-pop": {
      name: "Plastering/POP",
      description: "Professional plastering and POP (Plaster of Paris) ceiling services",
      services: [
        "Wall plastering",
        "POP ceiling installation",
        "Decorative moldings",
        "Repair and restoration",
        "Texture application",
        "Surface preparation"
      ],
      averagePrice: "₦20,000 - ₦300,000",
      timeframe: "2-10 days",
      materials: ["Plaster", "POP", "Mesh", "Primers", "Tools", "Finishing materials"],
      whatToExpected: "Plasterers create smooth, even surfaces on walls and decorative ceiling features using traditional and modern techniques.",
      whenToHire: "For wall finishing, decorative ceilings, repairs, or when preparing surfaces for painting.",
      tips: [
        "Allow proper drying time",
        "Ensure surface preparation",
        "Discuss finish quality expectations",
        "Plan for dust and mess protection",
        "Verify material quality"
      ],
      redFlags: [
        "Rushes drying process",
        "Poor surface preparation",
        "Uses low-quality materials",
        "Inconsistent thickness application",
        "Cannot achieve smooth finish"
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