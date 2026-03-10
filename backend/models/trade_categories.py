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
    
    # Column 2
    "Home Extensions",
    "Scaffolding",
    "Flooring",
    "Bathroom Fitting",
    "Generator Services",
    "Welding",
    
    # Column 3
    "Renovations",
    "Painting",
    "Carpentry",
    "Interior Design",
    "Solar & Inverter Installation",
    "Locksmithing",
    
    # Column 4
    "Roofing",
    "Plastering/POP",
    "Furniture Making",
    "Electrical Repairs",
    "CCTV & Security Systems",
    "General Handyman Work"
    ,
    # Additional services (to maintain 28 total)
    "Cleaning",
    "Relocation/Moving",
    "Waste Disposal",
    "Recycling"
]

def _to_slug(s: str) -> str:
    s = (s or "").lower()
    s = s.replace("&", " and ").replace("/", " ")
    import re
    s = re.sub(r"\s+", " ", s).strip()
    s = re.sub(r"[^a-z0-9 ]", "", s)
    return s.replace(" ", "-")

def normalize_trade_category(raw: str) -> str:
    """
    Normalize common variants to a canonical category name.
    Keeps behavior tight and explicit to avoid accidental mismatches.
    """
    if not raw:
        return ""
    text = raw.strip()
    lower = text.lower()
    # Known synonyms (extend conservatively)
    synonyms = {
        "cleaning services": "Cleaning",
        "cleaning service": "Cleaning",
        "handyman": "General Handyman Work",
        "general handyman": "General Handyman Work",
        "general handyman work": "General Handyman Work",
    }
    if lower in synonyms:
        return synonyms[lower]
    # Try slug matching for exact canonical category names
    target = _to_slug(text)
    for canonical in NIGERIAN_TRADE_CATEGORIES:
        if _to_slug(canonical) == target:
            return canonical
    return text

def validate_trade_category(category: str) -> bool:
    """Validate if a trade category is in the approved list (with normalization)"""
    canonical = normalize_trade_category(category)
    return canonical in NIGERIAN_TRADE_CATEGORIES

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
