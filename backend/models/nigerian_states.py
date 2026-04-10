# Nigerian States for ServiceHub Platform
# Updated service coverage areas

NIGERIAN_STATES = [
    "Abuja",
    "Lagos", 
    "Delta",
    "Rivers State",
    "Edo",
    "Bayelsa",
    "Enugu",
    "Cross Rivers"
]

STATE_ALIASES = {
    "Benin": "Edo",
}


def canonical_state_name(state: str) -> str:
    state_name = (state or "").strip()
    return STATE_ALIASES.get(state_name, state_name)

def validate_nigerian_state(state: str) -> bool:
    """Validate if a state is in the approved service coverage list"""
    return canonical_state_name(state) in NIGERIAN_STATES

def get_all_states() -> list:
    """Get all available Nigerian states"""
    return NIGERIAN_STATES.copy()

# State groupings for better organization (optional)
STATE_REGIONS = {
    "Federal Capital Territory": [
        "Abuja"
    ],
    "South West": [
        "Lagos"
    ],
    "South South": [
        "Delta",
        "Rivers State", 
        "Bayelsa",
        "Cross Rivers"
    ],
    "South East": [
        "Enugu"
    ],
    "South South (Edo)": [
        "Edo"
    ]
}

# Postcodes mapping for major areas (sample data)
STATE_POSTCODES = {
    "Abuja": ["900001", "901101", "902101"],
    "Lagos": ["100001", "101001", "102001", "103001"],
    "Delta": ["320001", "321001", "322001"],
    "Rivers State": ["500001", "501001", "502001"],
    "Edo": ["300001", "301001"],
    "Bayelsa": ["560001", "561001"],
    "Enugu": ["400001", "401001", "402001"],
    "Cross Rivers": ["540001", "541001", "542001"]
}
