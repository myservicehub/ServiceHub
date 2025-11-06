// Comprehensive Skills Test Questions for Nigerian Tradespeople
// 20 questions per trade category covering technical knowledge, safety, and Nigerian standards

export const skillsTestQuestions = {
  'Plumbing': [
    {
      question: "What is the standard pipe diameter for main water supply in Nigerian residential buildings?",
      options: ["15mm", "20mm", "25mm", "32mm"],
      correct: 2,
      category: "Technical Knowledge",
      explanation: "25mm is the standard diameter for main residential water supply lines in Nigeria."
    },
    {
      question: "Which pipe material is NOT suitable for hot water distribution in Nigerian climate?",
      options: ["Copper pipes", "Regular PVC pipes", "PPR pipes", "Stainless steel pipes"],
      correct: 1,
      category: "Materials & Climate",
      explanation: "Regular PVC pipes cannot withstand hot water temperatures and will deform."
    },
    {
      question: "What is the minimum slope required for waste pipes in Nigeria?",
      options: ["1:40", "1:60", "1:80", "1:100"],
      correct: 1,
      category: "Nigerian Building Code",
      explanation: "Nigerian building codes require a minimum slope of 1:60 for waste pipes to ensure proper drainage."
    },
    {
      question: "During rainy season in Nigeria, what is the primary concern for external plumbing?",
      options: ["Pipe expansion", "Water pressure", "Flooding and blockages", "Corrosion"],
      correct: 2,
      category: "Safety & Climate",
      explanation: "Flooding and blockages are major concerns during Nigeria's intense rainy seasons."
    },
    {
      question: "What pressure should residential water systems be tested at?",
      options: ["1.5 times working pressure", "2 times working pressure", "2.5 times working pressure", "3 times working pressure"],
      correct: 0,
      category: "Safety Standards",
      explanation: "Systems should be tested at 1.5 times the working pressure for safety verification."
    },
    {
      question: "Which valve type is best for main water shut-off in Nigerian homes?",
      options: ["Gate valve", "Ball valve", "Globe valve", "Check valve"],
      correct: 1,
      category: "Technical Knowledge",
      explanation: "Ball valves provide reliable shut-off and are less prone to failure in Nigerian conditions."
    },
    {
      question: "What is the recommended water pressure for residential buildings in Nigeria?",
      options: ["1-2 bar", "2-3 bar", "3-4 bar", "4-5 bar"],
      correct: 1,
      category: "Nigerian Standards",
      explanation: "2-3 bar is the optimal pressure range for Nigerian residential water systems."
    },
    {
      question: "When installing pipes in Nigerian soil conditions, what protection is essential?",
      options: ["UV protection", "Corrosion protection", "Thermal protection", "Pressure protection"],
      correct: 1,
      category: "Local Conditions",
      explanation: "Nigerian soil can be highly corrosive, requiring proper pipe protection."
    },
    {
      question: "What size pipe is required for a toilet waste connection?",
      options: ["75mm", "100mm", "110mm", "150mm"],
      correct: 2,
      category: "Technical Knowledge",
      explanation: "110mm is the standard size for toilet waste connections."
    },
    {
      question: "Which sealant is NOT suitable for potable water systems?",
      options: ["PTFE tape", "Pipe dope", "Silicone sealant", "Hemp and paste"],
      correct: 2,
      category: "Safety & Health",
      explanation: "Regular silicone sealant is not food-safe and unsuitable for drinking water systems."
    },
    {
      question: "What is the maximum horizontal distance for waste pipe runs without supports?",
      options: ["1 meter", "1.5 meters", "2 meters", "2.5 meters"],
      correct: 1,
      category: "Installation Standards",
      explanation: "Waste pipes should be supported every 1.5 meters maximum to prevent sagging."
    },
    {
      question: "In Nigeria's hard water regions, what treatment is commonly needed?",
      options: ["Filtration only", "Water softening", "Chlorination", "pH adjustment"],
      correct: 1,
      category: "Water Quality",
      explanation: "Water softening is essential in hard water areas to prevent scale buildup."
    },
    {
      question: "What is the standard height for washbasin installation?",
      options: ["750mm", "800mm", "850mm", "900mm"],
      correct: 2,
      category: "Installation Standards",
      explanation: "850mm is the standard height for washbasin installation in Nigeria."
    },
    {
      question: "Which tool is essential for detecting gas leaks in plumbing work?",
      options: ["Pressure gauge", "Leak detection spray", "Multimeter", "Spirit level"],
      correct: 1,
      category: "Safety Equipment",
      explanation: "Leak detection spray is essential for safely identifying gas leaks."
    },
    {
      question: "What causes water hammer in plumbing systems?",
      options: ["Low pressure", "High pressure", "Sudden valve closure", "Pipe blockage"],
      correct: 2,
      category: "Problem Diagnosis",
      explanation: "Water hammer is caused by sudden valve closure causing pressure waves."
    },
    {
      question: "In Nigerian building codes, what clearance is required around water heaters?",
      options: ["300mm", "450mm", "600mm", "750mm"],
      correct: 2,
      category: "Safety Codes",
      explanation: "600mm clearance is required around water heaters for safety and maintenance access."
    },
    {
      question: "Which backflow prevention device is required for residential water systems?",
      options: ["Check valve", "Pressure reducing valve", "Backflow preventer", "Stop valve"],
      correct: 2,
      category: "Safety & Health",
      explanation: "Backflow preventers protect potable water from contamination."
    },
    {
      question: "What pipe joining method is preferred for underground water mains?",
      options: ["Threaded joints", "Solvent welding", "Fusion welding", "Compression fittings"],
      correct: 2,
      category: "Installation Methods",
      explanation: "Fusion welding provides the strongest, most reliable joints for underground pipes."
    },
    {
      question: "In Lagos coastal areas, what additional consideration affects pipe installation?",
      options: ["High humidity", "Salt air corrosion", "Sand infiltration", "All of the above"],
      correct: 3,
      category: "Regional Considerations",
      explanation: "Coastal areas face multiple challenges including humidity, salt corrosion, and sand."
    },
    {
      question: "What is the recommended slope for storm water drainage in Nigeria?",
      options: ["1:100", "1:150", "1:200", "1:300"],
      correct: 1,
      category: "Drainage Standards",
      explanation: "1:150 slope is recommended for effective storm water drainage in Nigerian conditions."
    }
  ],

  'Electrical Repairs': [
    {
      question: "What is the standard single-phase voltage supply in Nigeria?",
      options: ["220V", "230V", "240V", "250V"],
      correct: 0,
      category: "Technical Knowledge",
      explanation: "Nigeria's standard single-phase supply voltage is 220V AC at 50Hz."
    },
    {
      question: "What wire gauge is required for a 20A lighting circuit?",
      options: ["1.5mm²", "2.5mm²", "4mm²", "6mm²"],
      correct: 1,
      category: "Safety Standards",
      explanation: "2.5mm² wire is the minimum requirement for 20A lighting circuits."
    },
    {
      question: "Which earthing system is commonly used in Nigerian residential buildings?",
      options: ["TT system", "TN-S system", "TN-C system", "IT system"],
      correct: 0,
      category: "Nigerian Standards",
      explanation: "TT earthing system is commonly used in Nigerian residential installations."
    },
    {
      question: "What is the maximum number of socket outlets on a 15A radial circuit?",
      options: ["6", "8", "10", "12"],
      correct: 2,
      category: "Circuit Design",
      explanation: "Maximum of 10 socket outlets are permitted on a 15A radial circuit."
    },
    {
      question: "In Nigeria's tropical climate, what additional protection is needed for outdoor electrical installations?",
      options: ["UV protection only", "Moisture protection only", "Both UV and moisture protection", "Heat protection only"],
      correct: 2,
      category: "Climate Considerations",
      explanation: "Both UV and moisture protection are essential in Nigeria's tropical climate."
    },
    {
      question: "What is the minimum height for light switches in residential buildings?",
      options: ["1200mm", "1350mm", "1400mm", "1500mm"],
      correct: 1,
      category: "Installation Standards",
      explanation: "Light switches should be installed at 1350mm height for accessibility."
    },
    {
      question: "Which circuit breaker type is required for protection against earth leakage?",
      options: ["MCB", "MCCB", "RCD", "RCBO"],
      correct: 3,
      category: "Safety Protection",
      explanation: "RCBO provides both overcurrent and earth leakage protection."
    },
    {
      question: "What cable type is suitable for underground electrical installation?",
      options: ["PVC/PVC cable", "XLPE/SWA/PVC cable", "PVC/SWA cable", "Flexible cable"],
      correct: 1,
      category: "Cable Selection",
      explanation: "XLPE/SWA/PVC cable provides moisture and mechanical protection for underground use."
    },
    {
      question: "In Nigerian electrical codes, what is the maximum earth loop impedance for a 30mA RCD?",
      options: ["1400 ohms", "1600 ohms", "1800 ohms", "2000 ohms"],
      correct: 1,
      category: "Testing Standards",
      explanation: "Maximum earth loop impedance for 30mA RCD should not exceed 1600 ohms."
    },
    {
      question: "What color coding is used for the neutral conductor in Nigeria?",
      options: ["Black", "Blue", "Brown", "Green/Yellow"],
      correct: 1,
      category: "Color Coding",
      explanation: "Blue is the standard color for neutral conductors in Nigerian electrical systems."
    },
    {
      question: "Which test must be performed before energizing a new electrical installation?",
      options: ["Continuity test only", "Insulation resistance test only", "Both continuity and insulation tests", "Earth fault loop impedance only"],
      correct: 2,
      category: "Testing Procedures",
      explanation: "Both continuity and insulation resistance tests are mandatory before energizing."
    },
    {
      question: "What is the recommended minimum lighting level for residential kitchens?",
      options: ["150 lux", "200 lux", "300 lux", "500 lux"],
      correct: 2,
      category: "Lighting Standards",
      explanation: "300 lux is the recommended minimum lighting level for kitchen work areas."
    },
    {
      question: "In areas prone to power fluctuations, what protection device is essential?",
      options: ["Stabilizer", "Surge protector", "UPS", "All of the above"],
      correct: 3,
      category: "Power Quality",
      explanation: "All devices may be needed depending on the specific power quality issues."
    },
    {
      question: "What is the maximum demand factor for socket outlets in residential calculations?",
      options: ["60%", "75%", "80%", "100%"],
      correct: 1,
      category: "Load Calculations",
      explanation: "75% demand factor is typically used for socket outlet load calculations."
    },
    {
      question: "Which wiring system is NOT permitted in wet locations?",
      options: ["Conduit wiring", "Cable tray wiring", "Surface wiring with PVC trunking", "Open wiring on insulators"],
      correct: 3,
      category: "Installation Methods",
      explanation: "Open wiring on insulators is not permitted in wet or damp locations."
    },
    {
      question: "What size distribution board is typically required for a 3-bedroom house?",
      options: ["8-way", "12-way", "16-way", "24-way"],
      correct: 2,
      category: "System Design",
      explanation: "16-way distribution board is typically adequate for a standard 3-bedroom house."
    },
    {
      question: "In Nigeria, what is the standard frequency of the electrical supply?",
      options: ["50 Hz", "60 Hz", "45 Hz", "55 Hz"],
      correct: 0,
      category: "System Parameters",
      explanation: "Nigeria's electrical supply operates at the standard frequency of 50 Hz."
    },
    {
      question: "What safety equipment is mandatory when working on live electrical systems?",
      options: ["Safety gloves only", "Safety boots only", "Both gloves and boots", "Hard hat only"],
      correct: 2,
      category: "Safety Equipment",
      explanation: "Both insulated gloves and safety boots are mandatory for live electrical work."
    },
    {
      question: "Which meter reading indicates a faulty insulation in electrical installation?",
      options: ["Above 1 MΩ", "Between 0.5-1 MΩ", "Below 0.5 MΩ", "Exactly 1 MΩ"],
      correct: 2,
      category: "Fault Diagnosis",
      explanation: "Insulation resistance below 0.5 MΩ indicates faulty insulation requiring attention."
    },
    {
      question: "What causes electrical fires most commonly in Nigerian homes?",
      options: ["Overloaded circuits", "Poor connections", "Substandard materials", "All of the above"],
      correct: 3,
      category: "Fire Safety",
      explanation: "All these factors contribute to electrical fires, with poor connections being very common."
    }
  ],

  'Building': [
    {
      question: "What is the standard concrete mix ratio for foundations in Nigeria?",
      options: ["1:2:4", "1:3:6", "1:2:3", "1:4:8"],
      correct: 0,
      category: "Concrete Technology",
      explanation: "1:2:4 (cement:sand:granite) is the standard mix for structural concrete foundations."
    },
    {
      question: "Which block size is most common for residential construction in Nigeria?",
      options: ["150mm", "200mm", "225mm", "300mm"],
      correct: 1,
      category: "Materials",
      explanation: "200mm (8-inch) blocks are most commonly used for residential walls in Nigeria."
    },
    {
      question: "What is the minimum depth for strip foundations in Nigerian soil conditions?",
      options: ["450mm", "600mm", "750mm", "900mm"],
      correct: 2,
      category: "Foundation Design",
      explanation: "750mm minimum depth is required to reach below the zone of seasonal moisture variation."
    },
    {
      question: "Which roofing material is best suited for Nigeria's tropical climate?",
      options: ["Corrugated iron sheets", "Clay tiles", "Aluminum roofing sheets", "All are suitable with proper installation"],
      correct: 3,
      category: "Climate Considerations",
      explanation: "All materials can work well when properly installed and ventilated for tropical conditions."
    },
    {
      question: "What is the standard ceiling height for residential buildings in Nigeria?",
      options: ["2.7m", "3.0m", "3.3m", "3.6m"],
      correct: 1,
      category: "Building Standards",
      explanation: "3.0m is the standard ceiling height providing comfort in tropical climate."
    },
    {
      question: "Which factor is most critical when selecting building materials in coastal Nigeria?",
      options: ["Cost", "Aesthetics", "Salt resistance", "Availability"],
      correct: 2,
      category: "Regional Considerations",
      explanation: "Salt resistance is crucial in coastal areas to prevent rapid deterioration."
    },
    {
      question: "What is the recommended wall thickness for load-bearing walls?",
      options: ["150mm", "200mm", "225mm", "300mm"],
      correct: 2,
      category: "Structural Design",
      explanation: "225mm is the minimum recommended thickness for load-bearing masonry walls."
    },
    {
      question: "Which ventilation feature is essential in Nigerian building design?",
      options: ["Roof ventilators", "Cross ventilation", "High-level windows", "All of the above"],
      correct: 3,
      category: "Ventilation Design",
      explanation: "All ventilation features are important for comfort in Nigeria's hot, humid climate."
    },
    {
      question: "What is the maximum spacing for reinforcement bars in concrete slabs?",
      options: ["150mm", "200mm", "250mm", "300mm"],
      correct: 2,
      category: "Reinforcement",
      explanation: "250mm is the maximum spacing for main reinforcement in concrete slabs."
    },
    {
      question: "Which termite protection method is most effective in Nigeria?",
      options: ["Chemical treatment only", "Physical barriers only", "Combined chemical and physical", "Natural methods only"],
      correct: 2,
      category: "Pest Control",
      explanation: "Combined chemical and physical barriers provide the most effective termite protection."
    },
    {
      question: "What is the minimum cover for reinforcement in foundation concrete?",
      options: ["25mm", "40mm", "50mm", "75mm"],
      correct: 3,
      category: "Durability",
      explanation: "75mm minimum cover is required for reinforcement in foundation concrete for durability."
    },
    {
      question: "Which test is used to determine the quality of cement on site?",
      options: ["Slump test", "Setting time test", "Consistency test", "All of the above"],
      correct: 3,
      category: "Quality Control",
      explanation: "Multiple tests are used to ensure cement quality including setting time and consistency."
    },
    {
      question: "What is the standard door height in Nigerian residential buildings?",
      options: ["2.0m", "2.1m", "2.2m", "2.4m"],
      correct: 1,
      category: "Building Standards",
      explanation: "2.1m is the standard door height in Nigerian residential construction."
    },
    {
      question: "Which factor most affects concrete curing in Nigeria's climate?",
      options: ["Temperature", "Humidity", "Wind", "All factors"],
      correct: 3,
      category: "Concrete Curing",
      explanation: "All environmental factors significantly affect concrete curing in tropical climate."
    },
    {
      question: "What is the recommended fall for flat roof drainage?",
      options: ["1:40", "1:60", "1:80", "1:100"],
      correct: 1,
      category: "Drainage Design",
      explanation: "1:60 fall is recommended for effective drainage on flat roofs."
    },
    {
      question: "Which safety equipment is mandatory on building sites?",
      options: ["Hard hats", "Safety boots", "High-vis vests", "All of the above"],
      correct: 3,
      category: "Safety Standards",
      explanation: "All listed safety equipment is mandatory on Nigerian construction sites."
    },
    {
      question: "What causes efflorescence on newly built walls?",
      options: ["Poor workmanship", "Excess moisture and salts", "Wrong materials", "Weather conditions"],
      correct: 1,
      category: "Building Defects",
      explanation: "Efflorescence is caused by moisture dissolving salts which then crystallize on surfaces."
    },
    {
      question: "Which building approval is required before construction in Nigeria?",
      options: ["Building permit", "Environmental impact assessment", "Fire safety certificate", "All may be required"],
      correct: 3,
      category: "Legal Requirements",
      explanation: "Different approvals may be required depending on location and building type."
    },
    {
      question: "What is the standard width for internal corridors?",
      options: ["900mm", "1000mm", "1200mm", "1500mm"],
      correct: 2,
      category: "Design Standards",
      explanation: "1200mm is the minimum width for internal corridors for accessibility."
    },
    {
      question: "Which problem is most common in poorly constructed foundations?",
      options: ["Cracking", "Settlement", "Water infiltration", "All of the above"],
      correct: 3,
      category: "Foundation Problems",
      explanation: "All these problems commonly occur in poorly constructed foundations."
    }
  ],

  // Add more trades: Tiling, Roofing, Carpentry, etc.
  'Tiling': [
    {
      question: "What is the standard thickness for floor tiles in high-traffic areas?",
      options: ["8mm", "10mm", "12mm", "15mm"],
      correct: 2,
      category: "Material Selection",
      explanation: "12mm thickness provides adequate durability for high-traffic areas."
    },
    {
      question: "Which adhesive type is best for bathroom wall tiling?",
      options: ["Cement-based", "Epoxy-based", "Flexible adhesive", "Standard tile adhesive"],
      correct: 2,
      category: "Adhesives",
      explanation: "Flexible adhesive accommodates movement and moisture in bathrooms."
    },
    {
      question: "What is the maximum tile size recommended without expansion joints?",
      options: ["3m²", "6m²", "9m²", "12m²"],
      correct: 2,
      category: "Installation Standards",
      explanation: "Expansion joints are required for tiled areas exceeding 9m²."
    },
    {
      question: "Which grout is suitable for swimming pool tiling?",
      options: ["Cement grout", "Epoxy grout", "Polymer-modified grout", "Sand-cement grout"],
      correct: 1,
      category: "Waterproofing",
      explanation: "Epoxy grout provides superior water and chemical resistance for pools."
    },
    {
      question: "What is the standard joint width for wall tiles?",
      options: ["1-2mm", "2-3mm", "3-5mm", "5-8mm"],
      correct: 1,
      category: "Installation Details",
      explanation: "1-2mm joint width is standard for wall tiles for aesthetic appeal."
    },
    // Add 15 more tiling questions...
    {
      question: "In Nigeria's humid climate, what preparation is essential before tiling bathrooms?",
      options: ["Primer only", "Waterproof membrane", "Leveling compound", "Base coat"],
      correct: 1,
      category: "Waterproofing",
      explanation: "Waterproof membrane is essential to prevent moisture penetration in humid conditions."
    },
    {
      question: "What causes tiles to 'drum' or sound hollow?",
      options: ["Wrong adhesive", "Insufficient adhesive coverage", "Poor substrate preparation", "All of the above"],
      correct: 3,
      category: "Installation Problems",
      explanation: "All factors can cause inadequate bonding leading to hollow-sounding tiles."
    },
    {
      question: "Which tool is essential for checking tile alignment?",
      options: ["Spirit level", "Tile spacers", "Rubber mallet", "All of the above"],
      correct: 3,
      category: "Tools & Equipment",
      explanation: "All tools are essential for proper tile installation and alignment."
    },
    {
      question: "What is the recommended curing time before grouting ceramic tiles?",
      options: ["6 hours", "12 hours", "24 hours", "48 hours"],
      correct: 2,
      category: "Installation Process",
      explanation: "24 hours curing time ensures proper adhesive set before grouting."
    },
    {
      question: "Which edge treatment is best for external tile corners?",
      options: ["Metal trim", "Plastic trim", "Mitred cuts", "Rounded edge tiles"],
      correct: 0,
      category: "Finishing Details",
      explanation: "Metal trim provides the most durable protection for external corners."
    },
    // Continue with more detailed questions for each category...
    {
      question: "What substrate moisture content is acceptable before tiling?",
      options: ["Less than 3%", "Less than 5%", "Less than 8%", "Less than 10%"],
      correct: 1,
      category: "Substrate Preparation",
      explanation: "Substrate moisture should be less than 5% for successful tile installation."
    },
    {
      question: "Which pattern requires the most tile wastage?",
      options: ["Straight lay", "Diagonal lay", "Herringbone", "Brick pattern"],
      correct: 2,
      category: "Layout Patterns",
      explanation: "Herringbone pattern typically requires 10-15% extra tiles due to cutting."
    },
    {
      question: "What is the maximum variation allowed in tile lippage?",
      options: ["1mm", "2mm", "3mm", "5mm"],
      correct: 1,
      category: "Quality Standards",
      explanation: "Maximum 2mm variation is acceptable for professional tile installation."
    },
    {
      question: "Which cleaning method should be avoided on natural stone tiles?",
      options: ["Water cleaning", "Neutral pH cleaners", "Acid-based cleaners", "Steam cleaning"],
      correct: 2,
      category: "Maintenance",
      explanation: "Acid-based cleaners can damage and etch natural stone surfaces."
    },
    {
      question: "What causes tile adhesive to fail in wet areas?",
      options: ["Wrong adhesive type", "Inadequate waterproofing", "Poor substrate preparation", "All of the above"],
      correct: 3,
      category: "Failure Analysis",
      explanation: "Multiple factors can cause adhesive failure in wet conditions."
    },
    {
      question: "Which joint sealant is best for movement joints in tiling?",
      options: ["Grout", "Silicone sealant", "Epoxy sealant", "Cement mortar"],
      correct: 1,
      category: "Sealants",
      explanation: "Silicone sealant accommodates movement while maintaining water resistance."
    },
    {
      question: "What is the standard fall for shower floor tiling?",
      options: ["1:60", "1:80", "1:100", "1:120"],
      correct: 1,
      category: "Drainage Design",
      explanation: "1:80 fall ensures proper drainage to shower waste without being too steep."
    },
    {
      question: "Which factor most affects tile color matching?",
      options: ["Lighting conditions", "Batch variations", "Installation method", "Grout color"],
      correct: 1,
      category: "Quality Control",
      explanation: "Batch variations can cause significant color differences in ceramic tiles."
    },
    {
      question: "What temperature range is ideal for tile installation?",
      options: ["5-35°C", "10-30°C", "15-25°C", "20-40°C"],
      correct: 1,
      category: "Environmental Conditions",
      explanation: "10-30°C provides optimal conditions for adhesive curing and workability."
    },
    {
      question: "Which defect indicates poor tile cutting technique?",
      options: ["Chipped edges", "Uneven sizes", "Color variation", "Surface scratches"],
      correct: 0,
      category: "Workmanship",
      explanation: "Chipped edges typically result from using wrong cutting tools or poor technique."
    }
  ],

  "Concrete Works": [
    {
      question: "What is the standard concrete mix ratio for structural work in Nigeria?",
      options: ["1:2:4", "1:3:6", "1:2:3", "1:4:8"],
      correct: 0,
      category: "Technical Knowledge",
      explanation: "1:2:4 (cement:sand:aggregate) is the standard mix for structural concrete in Nigeria."
    },
    {
      question: "What is the minimum curing period for concrete in Nigerian tropical climate?",
      options: ["7 days", "14 days", "21 days", "28 days"],
      correct: 3,
      category: "Curing Standards",
      explanation: "28 days is the standard curing period for concrete to achieve full strength."
    },
    {
      question: "Which aggregate size is best for concrete foundations?",
      options: ["10mm", "20mm", "25mm", "40mm"],
      correct: 1,
      category: "Materials",
      explanation: "20mm aggregate provides optimal strength and workability for foundation concrete."
    },
    {
      question: "What water-cement ratio gives the strongest concrete?",
      options: ["0.3", "0.45", "0.6", "0.8"],
      correct: 1,
      category: "Mix Design",
      explanation: "0.45 water-cement ratio provides optimal strength while maintaining workability."
    },
    {
      question: "How long should concrete be protected from rain after pouring?",
      options: ["2 hours", "6 hours", "24 hours", "48 hours"],
      correct: 2,
      category: "Weather Protection",
      explanation: "Concrete needs 24 hours protection from rain to prevent surface damage."
    },
    {
      question: "What is the maximum slump for structural concrete?",
      options: ["25mm", "50mm", "75mm", "100mm"],
      correct: 2,
      category: "Quality Control",
      explanation: "75mm maximum slump ensures proper strength while allowing adequate workability."
    },
    {
      question: "Which admixture is commonly used in Nigerian hot climate?",
      options: ["Accelerator", "Retarder", "Air entrainer", "Superplasticizer"],
      correct: 1,
      category: "Admixtures",
      explanation: "Retarders slow down concrete setting in hot Nigerian climate."
    },
    {
      question: "What is the minimum concrete cover for reinforcement in foundations?",
      options: ["25mm", "40mm", "50mm", "75mm"],
      correct: 3,
      category: "Reinforcement",
      explanation: "75mm minimum cover protects reinforcement from corrosion in Nigerian soil."
    },
    {
      question: "At what temperature should concrete pouring be avoided?",
      options: ["Above 25°C", "Above 30°C", "Above 35°C", "Above 40°C"],
      correct: 2,
      category: "Temperature Control",
      explanation: "Concrete pouring above 35°C can cause rapid moisture loss and cracking."
    },
    {
      question: "What causes plastic shrinkage cracks in concrete?",
      options: ["Too much water", "Rapid moisture loss", "Poor mixing", "Cold weather"],
      correct: 1,
      category: "Defect Prevention",
      explanation: "Rapid moisture loss from surface causes plastic shrinkage cracks."
    },
    {
      question: "Which test checks concrete workability on site?",
      options: ["Cube test", "Slump test", "Flow test", "Ball penetration test"],
      correct: 1,
      category: "Site Testing",
      explanation: "Slump test is the standard field test for concrete workability."
    },
    {
      question: "What is the standard size for concrete test cubes in Nigeria?",
      options: ["100mm", "150mm", "200mm", "300mm"],
      correct: 1,
      category: "Testing Standards",
      explanation: "150mm cubes are standard for concrete strength testing in Nigeria."
    },
    {
      question: "How should concrete be transported to prevent segregation?",
      options: ["Open truck", "Covered truck", "Ready-mix truck", "Wheelbarrow only"],
      correct: 2,
      category: "Transportation",
      explanation: "Ready-mix trucks prevent segregation and maintain concrete quality."
    },
    {
      question: "What is the maximum time between mixing and placing concrete?",
      options: ["30 minutes", "60 minutes", "90 minutes", "120 minutes"],
      correct: 1,
      category: "Placement Time",
      explanation: "Concrete should be placed within 60 minutes of mixing to maintain quality."
    },
    {
      question: "Which vibration method is best for foundation concrete?",
      options: ["Manual", "Needle vibrator", "Table vibrator", "External vibrator"],
      correct: 1,
      category: "Compaction",
      explanation: "Needle vibrators provide effective compaction for foundation concrete."
    },
    {
      question: "What safety equipment is mandatory when working with concrete?",
      options: ["Gloves only", "Boots only", "Gloves and boots", "Full protective gear"],
      correct: 3,
      category: "Safety Standards",
      explanation: "Full protective gear including gloves, boots, and eye protection is mandatory."
    },
    {
      question: "How should concrete be cured in Nigerian dry season?",
      options: ["Air curing", "Water curing", "Steam curing", "Chemical curing"],
      correct: 1,
      category: "Seasonal Curing",
      explanation: "Water curing is essential in Nigerian dry season to prevent rapid moisture loss."
    },
    {
      question: "What causes honeycombing in concrete?",
      options: ["Too much cement", "Poor compaction", "Too much water", "Wrong aggregate"],
      correct: 1,
      category: "Quality Issues",
      explanation: "Poor compaction leaves voids creating honeycomb appearance."
    },
    {
      question: "Which concrete grade is suitable for residential foundations?",
      options: ["C15", "C20", "C25", "C30"],
      correct: 2,
      category: "Grade Selection",
      explanation: "C25 concrete provides adequate strength for residential foundations."
    },
    {
      question: "What is the first aid for concrete burns?",
      options: ["Apply oil", "Flush with water", "Apply ice", "Cover with cloth"],
      correct: 1,
      category: "First Aid",
      explanation: "Immediate flushing with clean water removes alkaline concrete from skin."
    }
  ],

  'Painting': [
    {
      question: "What primer is best for new concrete walls before painting?",
      options: ["Oil-based primer", "Water-based primer", "Alkali-resistant primer", "No primer needed"],
      correct: 2,
      category: "Surface Preparation",
      explanation: "Alkali-resistant primer prevents paint failure on alkaline concrete surfaces."
    },
    {
      question: "In Nigerian humid climate, what paint type is best for exterior walls?",
      options: ["Emulsion paint", "Oil paint", "Acrylic paint", "Lime wash"],
      correct: 2,
      category: "Climate Considerations",
      explanation: "Acrylic paint resists moisture and humidity better than other types."
    },
    {
      question: "What is the recommended moisture content before painting interior walls?",
      options: ["Less than 5%", "Less than 10%", "Less than 15%", "Less than 20%"],
      correct: 1,
      category: "Moisture Control",
      explanation: "Walls should have less than 10% moisture content for proper paint adhesion."
    },
    {
      question: "Which tool gives the smoothest finish on walls?",
      options: ["Brush", "Roller", "Spray gun", "Sponge"],
      correct: 2,
      category: "Application Tools",
      explanation: "Spray guns provide the smoothest, most even finish when properly used."
    },
    {
      question: "What causes paint to peel off walls?",
      options: ["Too thick application", "Poor surface preparation", "Wrong color choice", "Expensive paint"],
      correct: 1,
      category: "Paint Failure",
      explanation: "Poor surface preparation is the main cause of paint peeling."
    },
    {
      question: "How long should primer dry before applying paint?",
      options: ["1 hour", "4 hours", "8 hours", "24 hours"],
      correct: 2,
      category: "Drying Time",
      explanation: "Primer should dry for 8 hours minimum before paint application."
    },
    {
      question: "What is the coverage area of 1 liter of quality emulsion paint?",
      options: ["5-8 m²", "10-12 m²", "15-18 m²", "20-25 m²"],
      correct: 1,
      category: "Material Calculation",
      explanation: "1 liter of quality emulsion paint typically covers 10-12 m² on prepared surfaces."
    },
    {
      question: "Which sandpaper grit is best for smoothing walls before painting?",
      options: ["60 grit", "120 grit", "220 grit", "400 grit"],
      correct: 1,
      category: "Surface Preparation",
      explanation: "120 grit sandpaper provides optimal smoothing without damaging the surface."
    },
    {
      question: "What safety equipment is essential for spray painting?",
      options: ["Gloves only", "Mask only", "Mask and goggles", "Full protective suit"],
      correct: 3,
      category: "Safety Standards",
      explanation: "Full protective equipment prevents inhalation and skin contact with paint."
    },
    {
      question: "How should paint brushes be cleaned after oil-based paint?",
      options: ["Water only", "Soap and water", "Turpentine/thinner", "Just wipe clean"],
      correct: 2,
      category: "Tool Maintenance",
      explanation: "Turpentine or paint thinner dissolves oil-based paint for proper brush cleaning."
    },
    {
      question: "What causes streaks in painted surfaces?",
      options: ["Wrong color", "Uneven application", "Too much paint", "Poor quality paint"],
      correct: 1,
      category: "Application Technique",
      explanation: "Uneven application pressure and overlapping strokes cause visible streaks."
    },
    {
      question: "Which weather condition is best for exterior painting?",
      options: ["Hot sunny day", "Rainy day", "Humid evening", "Cool dry day"],
      correct: 3,
      category: "Weather Conditions",
      explanation: "Cool dry conditions allow proper paint flow and drying without defects."
    },
    {
      question: "What is the purpose of undercoat in painting?",
      options: ["Color matching", "Surface sealing", "Cost reduction", "Quick drying"],
      correct: 1,
      category: "Paint System",
      explanation: "Undercoat seals surfaces and provides better adhesion for topcoat."
    },
    {
      question: "How many coats are typically needed for good paint coverage?",
      options: ["1 coat", "2 coats", "3 coats", "4 coats"],
      correct: 1,
      category: "Application Standards",
      explanation: "2 coats (primer + topcoat) provide adequate coverage and durability."
    },
    {
      question: "What should be done to walls with efflorescence before painting?",
      options: ["Paint over it", "Scrape and seal", "Just prime", "Ignore it"],
      correct: 1,
      category: "Defect Treatment",
      explanation: "Efflorescence must be scraped off and surface sealed before painting."
    },
    {
      question: "Which paint defect appears as white chalky residue?",
      options: ["Blistering", "Chalking", "Flaking", "Bleeding"],
      correct: 1,
      category: "Paint Defects",
      explanation: "Chalking appears as white powdery residue from paint deterioration."
    },
    {
      question: "What mixing ratio is typical for thinning emulsion paint?",
      options: ["1:1", "4:1", "10:1", "No thinning needed"],
      correct: 2,
      category: "Paint Mixing",
      explanation: "10:1 (paint:water) ratio provides optimal consistency for brush application."
    },
    {
      question: "How should paint be stored to maintain quality?",
      options: ["In direct sunlight", "In cool dry place", "In refrigerator", "Anywhere is fine"],
      correct: 1,
      category: "Storage",
      explanation: "Cool dry storage prevents paint deterioration and maintains quality."
    },
    {
      question: "What causes paint to bubble or blister?",
      options: ["Good preparation", "Moisture under paint", "Correct primer", "Proper drying"],
      correct: 1,
      category: "Paint Problems",
      explanation: "Moisture trapped under paint film causes bubbling and blistering."
    },
    {
      question: "Which measurement tool is essential for accurate paint estimates?",
      options: ["Ruler", "Measuring tape", "Calculator", "Scale"],
      correct: 1,
      category: "Measurement Tools",
      explanation: "Measuring tape accurately determines surface areas for paint calculation."
    }
  ]

  // Add more trade categories: 'Roofing', 'Carpentry', etc.
};

// Canonical → local category alias map to ensure coverage for all 28 trades
// When a canonical trade has no dedicated question set yet, map to the closest available category.
const TRADE_ALIAS_MAP = {
  // Column 1
  "Building": "Building",
  "Concrete Works": "Building",
  "Tiling": "Tiling",
  "Door & Window Installation": "Building",
  "Air Conditioning & Refrigeration": "Electrical Repairs",
  "Plumbing": "Plumbing",

  // Column 2
  "Home Extensions": "Building",
  "Scaffolding": "Building",
  "Flooring": "Tiling",
  "Bathroom Fitting": "Plumbing",
  "Generator Services": "Electrical Repairs",
  "Welding": "Building",

  // Column 3
  "Renovations": "Building",
  "Painting": "Painting",
  "Carpentry": "Building",
  "Interior Design": "Painting",
  "Solar & Inverter Installation": "Electrical Repairs",
  "Locksmithing": "Building",

  // Column 4
  "Roofing": "Building",
  "Plastering/POP": "Painting",
  "Furniture Making": "Building",
  "Electrical Repairs": "Electrical Repairs",
  "CCTV & Security Systems": "Electrical Repairs",
  "General Handyman Work": "Building",

  // General Services additions
  "Cleaning": "Building",
  "Relocation/Moving": "Building",
  "Waste Disposal": "Building",
  "Recycling": "Building"
};

// Function to get questions for specific trades
export const getQuestionsForTrades = (selectedTrades, questionsPerTrade = 20) => {
  const allQuestions = {};

  selectedTrades.forEach(trade => {
    // Determine the base category that has questions
    const baseCategory = skillsTestQuestions[trade]
      ? trade
      : TRADE_ALIAS_MAP[trade];

    let sourceCategory = null;
    if (baseCategory && skillsTestQuestions[baseCategory]) {
      sourceCategory = baseCategory;
    } else if (skillsTestQuestions["Building"]) {
      // Safe global fallback to Building if nothing else matches
      sourceCategory = "Building";
    }

    if (sourceCategory) {
      const tradeQuestions = skillsTestQuestions[sourceCategory] || [];

      if (tradeQuestions.length > questionsPerTrade) {
        const shuffled = [...tradeQuestions].sort(() => 0.5 - Math.random());
        allQuestions[trade] = shuffled.slice(0, questionsPerTrade);
      } else {
        allQuestions[trade] = tradeQuestions;
      }
    } else {
      // If absolutely no fallback available, set empty array to allow skip logic upstream
      allQuestions[trade] = [];
    }
  });

  return allQuestions;
};

// Function to calculate test score
export const calculateTestScore = (answers, questions) => {
  const totalQuestions = Array.isArray(questions) ? questions.length : 0;
  let correctAnswers = 0;

  if (totalQuestions === 0) {
    // Graceful handling when no questions are available
    return {
      score: 100,
      correct: 0,
      total: 0,
      passed: true
    };
  }

  questions.forEach((question, index) => {
    if (answers[index] === question.correct) {
      correctAnswers++;
    }
  });

  const percentage = (correctAnswers / totalQuestions) * 100;
  return {
    score: Math.round(percentage),
    correct: correctAnswers,
    total: totalQuestions,
    passed: (correctAnswers / totalQuestions) >= 0.8 // 80% pass rate
  };
};

export default skillsTestQuestions;