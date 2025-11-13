// Approximate coordinates for Nigerian state capitals and major cities
export const CITY_COORDS = {
  Lagos: { lat: 6.5244, lng: 3.3792 },
  Abuja: { lat: 9.0765, lng: 7.3986 },
  Kano: { lat: 12.0022, lng: 8.592 },
  "Port Harcourt": { lat: 4.8242, lng: 7.0336 },
  Benin: { lat: 6.335, lng: 5.6037 },
  Warri: { lat: 5.523, lng: 5.761 },
  Asaba: { lat: 6.198, lng: 6.732 },
  Enugu: { lat: 6.4599, lng: 7.494 },
  Yenagoa: { lat: 4.9248, lng: 6.2643 },
  Calabar: { lat: 4.9517, lng: 8.322 },
  Ibadan: { lat: 7.3775, lng: 3.947 },
  Abeokuta: { lat: 7.1475, lng: 3.361 },
  Kaduna: { lat: 10.516, lng: 7.438 },
  Ilorin: { lat: 8.4966, lng: 4.542 },
  Jos: { lat: 9.8965, lng: 8.858 },
  Owerri: { lat: 5.4836, lng: 7.033 },
  Akure: { lat: 7.2575, lng: 5.193 },
  Uyo: { lat: 5.037, lng: 7.912 },
  Awka: { lat: 6.210, lng: 7.071 },
  Onitsha: { lat: 6.151, lng: 6.785 },
  Makurdi: { lat: 7.732, lng: 8.539 },
  Lokoja: { lat: 7.799, lng: 6.740 },
  Minna: { lat: 9.6139, lng: 6.556 },
  Sokoto: { lat: 13.061, lng: 5.241 },
  Bauchi: { lat: 10.315, lng: 9.843 },
  Gombe: { lat: 10.290, lng: 11.175 },
  Maiduguri: { lat: 11.833, lng: 13.151 },
  Jalingo: { lat: 8.889, lng: 11.359 },
  Lafia: { lat: 8.494, lng: 8.515 },
  BirninKebbi: { lat: 12.456, lng: 4.197 },
  Gusau: { lat: 12.167, lng: 6.663 },
  Yola: { lat: 9.259, lng: 12.458 },
  Abakaliki: { lat: 6.324, lng: 8.113 },
  Umuahia: { lat: 5.532, lng: 7.493 },
};

// Normalized state names mapped to representative coordinates (typically state capitals)
export const STATE_CAPITAL_COORDS = {
  "abia": { lat: 5.532, lng: 7.493 }, // Umuahia
  "adamawa": { lat: 9.259, lng: 12.458 }, // Yola
  "akwa ibom": { lat: 5.037, lng: 7.912 }, // Uyo
  "anambra": { lat: 6.210, lng: 7.071 }, // Awka
  "bauchi": { lat: 10.315, lng: 9.843 },
  "bayelsa": { lat: 4.9248, lng: 6.2643 }, // Yenagoa
  "benue": { lat: 7.732, lng: 8.539 }, // Makurdi
  "borno": { lat: 11.833, lng: 13.151 }, // Maiduguri
  "cross river": { lat: 4.9517, lng: 8.322 }, // Calabar
  "delta": { lat: 6.198, lng: 6.732 }, // Asaba
  "ebonyi": { lat: 6.324, lng: 8.113 }, // Abakaliki
  "edo": { lat: 6.335, lng: 5.6037 }, // Benin City
  "ekiti": { lat: 7.621, lng: 5.221 }, // Ado Ekiti
  "enugu": { lat: 6.4599, lng: 7.494 },
  "fct": { lat: 9.0765, lng: 7.3986 }, // Abuja
  "abuja": { lat: 9.0765, lng: 7.3986 }, // shorthand
  "gombe": { lat: 10.290, lng: 11.175 },
  "imo": { lat: 5.4836, lng: 7.033 }, // Owerri
  "jigawa": { lat: 12.228, lng: 9.561 }, // Dutse (approx)
  "kaduna": { lat: 10.516, lng: 7.438 },
  "kano": { lat: 12.0022, lng: 8.592 },
  "katsina": { lat: 12.988, lng: 7.601 }, // Katsina
  "kebbi": { lat: 12.456, lng: 4.197 }, // Birnin Kebbi
  "kogi": { lat: 7.799, lng: 6.740 }, // Lokoja
  "kwara": { lat: 8.4966, lng: 4.542 }, // Ilorin
  "lagos": { lat: 6.5244, lng: 3.3792 },
  "nasarawa": { lat: 8.494, lng: 8.515 }, // Lafia
  "niger": { lat: 9.6139, lng: 6.556 }, // Minna
  "ogun": { lat: 7.1475, lng: 3.361 }, // Abeokuta
  "ondo": { lat: 7.2575, lng: 5.193 }, // Akure
  "osun": { lat: 7.782, lng: 4.556 }, // Osogbo (approx)
  "oyo": { lat: 7.3775, lng: 3.947 }, // Ibadan
  "plateau": { lat: 9.8965, lng: 8.858 }, // Jos
  "rivers": { lat: 4.8242, lng: 7.0336 }, // Port Harcourt
  "sokoto": { lat: 13.061, lng: 5.241 },
  "taraba": { lat: 8.889, lng: 11.359 }, // Jalingo
  "yobe": { lat: 11.748, lng: 11.964 }, // Damaturu (approx)
  "zamfara": { lat: 12.167, lng: 6.663 }, // Gusau
};

// Common aliases and variations for states
export const STATE_ALIASES = {
  "abuja-fct": "fct",
  "federal capital territory": "fct",
  "ph": "rivers",
  "port harcourt": "rivers",
  "cross rivers": "cross river",
};

// Selected LGA coordinates for high-traffic areas (approximate)
export const LGA_HINTS = {
  // Lagos LGAs
  "ikeja": { lat: 6.6018, lng: 3.3515 },
  "surulere": { lat: 6.494, lng: 3.349 },
  "ikorodu": { lat: 6.615, lng: 3.508 },
  "eti-osa": { lat: 6.444, lng: 3.472 },
  "alimosho": { lat: 6.626, lng: 3.277 },
  "agege": { lat: 6.625, lng: 3.325 },
  "ajeromi": { lat: 6.452, lng: 3.311 },
  "badagry": { lat: 6.439, lng: 2.887 },
  // Abuja Area Councils
  "amac": { lat: 9.054, lng: 7.476 },
  "bwari": { lat: 9.306, lng: 7.381 },
  "gwagwalada": { lat: 8.944, lng: 7.09 },
  "kuje": { lat: 8.885, lng: 7.237 },
  "kwali": { lat: 8.897, lng: 7.028 },
  "abaji": { lat: 8.475, lng: 6.945 },
  // Rivers LGAs
  "obio/akpor": { lat: 4.852, lng: 7.012 },
  "phalga": { lat: 4.815, lng: 7.033 },
};

const normalizeText = (s) => (s || "").toLowerCase().replace(/\s+/g, " ").trim();

const findStateFromText = (text) => {
  const t = normalizeText(text);
  // direct match
  for (const state of Object.keys(STATE_CAPITAL_COORDS)) {
    if (t.includes(state)) return state;
  }
  // alias match
  for (const [alias, normalized] of Object.entries(STATE_ALIASES)) {
    if (t.includes(alias)) return normalized;
  }
  return null;
};

export function resolveCoordinatesFromStructuredLocation({ state, lga, town, addressText }) {
  // Try town mapping first
  if (town) {
    const t = Object.keys(CITY_COORDS).find((k) => normalizeText(town).includes(normalizeText(k)));
    if (t) {
      const { lat, lng } = CITY_COORDS[t];
      return { latitude: lat, longitude: lng, source: "town" };
    }
  }

  // Try LGA hints
  if (lga) {
    const l = Object.keys(LGA_HINTS).find((k) => normalizeText(lga).includes(normalizeText(k)));
    if (l) {
      const { lat, lng } = LGA_HINTS[l];
      return { latitude: lat, longitude: lng, source: "lga" };
    }
  }

  // Try state mapping
  if (state) {
    const normalizedState = STATE_ALIASES[normalizeText(state)] || normalizeText(state);
    const stateCoords = STATE_CAPITAL_COORDS[normalizedState];
    if (stateCoords) {
      return { latitude: stateCoords.lat, longitude: stateCoords.lng, source: "state" };
    }
  }

  // Try text for city or state
  const txt = normalizeText(addressText);
  if (txt) {
    // city search
    for (const [city, coords] of Object.entries(CITY_COORDS)) {
      if (txt.includes(normalizeText(city))) {
        return { latitude: coords.lat, longitude: coords.lng, source: "text-city" };
      }
    }
    // state search
    const detectedState = findStateFromText(txt);
    if (detectedState) {
      const sc = STATE_CAPITAL_COORDS[detectedState];
      return { latitude: sc.lat, longitude: sc.lng, source: "text-state" };
    }
  }

  return null;
}

export function resolveCoordinatesFromLocationText(locationText) {
  const result = resolveCoordinatesFromStructuredLocation({ state: null, lga: null, town: null, addressText: locationText });
  return result;
}

export const DEFAULT_TRAVEL_DISTANCE_KM = 25;