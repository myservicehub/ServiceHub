# Nigerian Market Trade Categories
# Comprehensive list of trades and services for the Nigerian marketplace

NIGERIAN_TRADE_CATEGORIES = [
    # Column 1
    "Building",
    "Concrete Works",
    "Tiling",
    "Door & Window Installation",
    "Air Conditioning & Refrigeration",
    "Plumbing",
    "Cleaning",
    
    # Column 2
    "Home Extensions",
    "Scaffolding",
    "Flooring",
    "Bathroom Fitting",
    "Generator Services",
    "Welding",
    "Relocation/Moving",
    
    # Column 3
    "Renovations",
    "Painting",
    "Carpentry",
    "Interior Design",
    "Solar & Inverter Installation",
    "Locksmithing",
    "Waste Disposal",
    
    # Column 4
    "Roofing",
    "Plastering/POP",
    "Furniture Making",
    "Electrical Repairs",
    "CCTV & Security Systems",
    "General Handyman Work",
    "Recycling"
]

# For validation purposes
def validate_trade_category(category: str) -> bool:
    """Validate if a trade category is in the approved list"""
    return category in NIGERIAN_TRADE_CATEGORIES

def get_all_categories() -> list:
    """Get all available trade categories"""
    return NIGERIAN_TRADE_CATEGORIES.copy()

# Category groupings for better UX
TRADE_CATEGORY_GROUPS = {
    "Construction & Building": [
        "Building",
        "Concrete Works",
        "Tiling",
        "Home Extensions",
        "Scaffolding",
        "Flooring",
        "Roofing",
        "Plastering/POP",
        "Renovations"
    ],
    "Installation & Repair": [
        "Door & Window Installation",
        "Bathroom Fitting",
        "Air Conditioning & Refrigeration",
        "Generator Services",
        "Solar & Inverter Installation",
        "Electrical Repairs",
        "CCTV & Security Systems",
        "Plumbing",
        "Welding",
        "Locksmithing"
    ],
    "Interior & Finishing": [
        "Painting",
        "Carpentry",
        "Furniture Making",
        "Interior Design"
    ],
    "General Services": [
        "General Handyman Work",
        "Cleaning",
        "Relocation/Moving",
        "Waste Disposal",
        "Recycling"
    ]
}