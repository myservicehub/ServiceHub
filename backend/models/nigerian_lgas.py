# Nigerian Local Government Areas (LGAs) for ServiceHub Platform
# Comprehensive LGA data for all 8 supported states

NIGERIAN_LGAS = {
    "Abuja": [
        "Abaji",
        "Bwari", 
        "Gwagwalada",
        "Kuje",
        "Kwali",
        "Municipal Area Council (AMAC)"
    ],
    "Lagos": [
        "Agege",
        "Ajeromi-Ifelodun",
        "Alimosho",
        "Amuwo-Odofin",
        "Apapa",
        "Badagry",
        "Epe",
        "Eti-Osa",
        "Ibeju-Lekki",
        "Ifako-Ijaiye",
        "Ikeja",
        "Ikorodu",
        "Kosofe",
        "Lagos Island",
        "Lagos Mainland",
        "Mushin",
        "Ojo",
        "Oshodi-Isolo",
        "Shomolu",
        "Surulere"
    ],
    "Delta": [
        "Aniocha North",
        "Aniocha South", 
        "Bomadi",
        "Burutu",
        "Ethiope East",
        "Ethiope West",
        "Ika North East",
        "Ika South",
        "Isoko North",
        "Isoko South",
        "Ndokwa East",
        "Ndokwa West",
        "Okpe",
        "Oshimili North",
        "Oshimili South",
        "Patani",
        "Sapele",
        "Udu",
        "Ughelli North",
        "Ughelli South",
        "Ukwuani",
        "Uvwie",
        "Warri North",
        "Warri South",
        "Warri South West"
    ],
    "Rivers State": [
        "Abua/Odual",
        "Ahoada East",
        "Ahoada West",
        "Akuku-Toru",
        "Andoni",
        "Asari-Toru",
        "Bonny",
        "Degema",
        "Eleme",
        "Emuoha",
        "Etche",
        "Gokana",
        "Ikwerre",
        "Khana",
        "Obio/Akpor",
        "Ogba/Egbema/Ndoni",
        "Ogu/Bolo",
        "Okrika",
        "Omuma",
        "Opobo/Nkoro",
        "Oyigbo",
        "Port Harcourt",
        "Tai"
    ],
    "Benin": [  # Edo State LGAs (Benin is the capital)
        "Akoko-Edo",
        "Egor",
        "Esan Central",
        "Esan North-East",
        "Esan South-East",
        "Esan West",
        "Etsako Central",
        "Etsako East",
        "Etsako West",
        "Igueben",
        "Ikpoba-Okha",
        "Oredo",
        "Orhionmwon",
        "Ovia North-East",
        "Ovia South-West",
        "Owan East",
        "Owan West",
        "Uhunmwonde"
    ],
    "Bayelsa": [
        "Brass",
        "Ekeremor",
        "Kolokuma/Opokuma",
        "Nembe",
        "Ogbia",
        "Sagbama",
        "Southern Ijaw",
        "Yenagoa"
    ],
    "Enugu": [
        "Aninri",
        "Awgu",
        "Enugu East",
        "Enugu North",
        "Enugu South",
        "Ezeagu",
        "Igbo Etiti",
        "Igbo Eze North",
        "Igbo Eze South",
        "Isi Uzo",
        "Nkanu East",
        "Nkanu West",
        "Nsukka",
        "Oji River",
        "Udenu",
        "Udi",
        "Uzo-Uwani"
    ],
    "Cross Rivers": [
        "Abi",
        "Akamkpa",
        "Akpabuyo",
        "Bakassi",
        "Bekwarra",
        "Biase",
        "Boki",
        "Calabar Municipal",
        "Calabar South",
        "Etung",
        "Ikom",
        "Obanliku",
        "Obubra",
        "Obudu",
        "Odukpani",
        "Ogoja",
        "Yakuur",
        "Yala"
    ]
}

def validate_lga_for_state(state: str, lga: str) -> bool:
    """Validate if an LGA belongs to the specified state"""
    if state not in NIGERIAN_LGAS:
        return False
    return lga in NIGERIAN_LGAS[state]

def get_lgas_for_state(state: str) -> list:
    """Get all LGAs for a specific state"""
    return NIGERIAN_LGAS.get(state, [])

def get_all_lgas() -> dict:
    """Get all states and their LGAs"""
    return NIGERIAN_LGAS.copy()

def get_all_states() -> list:
    """Get all available states"""
    return list(NIGERIAN_LGAS.keys())

# Sample zip codes for major LGAs (Nigerian postal codes)
LGA_ZIP_CODES = {
    "Abuja": {
        "Municipal Area Council (AMAC)": ["900001", "900211", "900271", "900281"],
        "Garki": ["900001"],
        "Wuse": ["900211"], 
        "Maitama": ["900271"],
        "Asokoro": ["900281"],
        "Gwagwalada": ["902101"],
        "Kuje": ["903101"],
        "Bwari": ["901101"],
        "Kwali": ["904101"],
        "Abaji": ["905101"]
    },
    "Lagos": {
        "Victoria Island": ["101241"],
        "Ikoyi": ["101233"], 
        "Lagos Island": ["101001"],
        "Ikeja": ["100001", "100271", "100281"],
        "Surulere": ["101283"],
        "Yaba": ["101212"],
        "Apapa": ["101007"],
        "Lekki": ["105102"],
        "Ajah": ["105102"],
        "Maryland": ["100218"],
        "Magodo": ["100218"],
        "Gbagada": ["100242"]
    },
    "Delta": {
        "Warri South": ["332001", "332102"],
        "Uvwie": ["332106"],
        "Sapele": ["331104"],
        "Ughelli North": ["333101"],
        "Ethiope East": ["334101"]
    },
    "Rivers State": {
        "Port Harcourt": ["500001", "500211", "500272"],
        "Obio/Akpor": ["500101"],
        "Eleme": ["502101"],
        "Ikwerre": ["503101"],
        "Oyigbo": ["504101"]
    },
    "Benin": {
        "Oredo": ["300001", "300211", "300283"],
        "Egor": ["300102"],
        "Ikpoba-Okha": ["300213"],
        "Ovia North-East": ["301101"],
        "Orhionmwon": ["302101"]
    },
    "Bayelsa": {
        "Yenagoa": ["560001", "560211"],
        "Sagbama": ["561101"],
        "Brass": ["562101"],
        "Nembe": ["563101"],
        "Ogbia": ["564101"]
    },
    "Enugu": {
        "Enugu North": ["400001"],
        "Enugu East": ["400211"], 
        "Enugu South": ["400283"],
        "Nsukka": ["410001"],
        "Udi": ["402101"],
        "Nkanu West": ["403101"]
    },
    "Cross Rivers": {
        "Calabar Municipal": ["540001", "540211"],
        "Calabar South": ["540281"],
        "Odukpani": ["541101"],
        "Akpabuyo": ["542101"],
        "Biase": ["543101"]
    }
}

def get_zip_codes_for_lga(state: str, lga: str) -> list:
    """Get sample zip codes for an LGA"""
    if state in LGA_ZIP_CODES and lga in LGA_ZIP_CODES[state]:
        return LGA_ZIP_CODES[state][lga]
    return []

def validate_zip_code(zip_code: str, state: str = None, lga: str = None) -> bool:
    """Validate Nigerian zip code format (6 digits)"""
    if not zip_code or not zip_code.isdigit() or len(zip_code) != 6:
        return False
    
    # If state and LGA provided, check if zip code matches
    if state and lga:
        valid_codes = get_zip_codes_for_lga(state, lga)
        if valid_codes and zip_code not in valid_codes:
            # Allow other 6-digit codes but verify format
            return True
    
    return True