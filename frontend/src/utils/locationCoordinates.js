export const CITY_COORDS = {
  Lagos: { lat: 6.5244, lng: 3.3792 },
  Abuja: { lat: 9.0765, lng: 7.3986 },
  Kano: { lat: 12.0022, lng: 8.5920 },
  "Port Harcourt": { lat: 4.8242, lng: 7.0336 },
  Benin: { lat: 6.335, lng: 5.6037 },
  Delta: { lat: 5.5544, lng: 5.7932 },
  Enugu: { lat: 6.4599, lng: 7.4940 },
  Bayelsa: { lat: 4.9248, lng: 6.2643 },
  "Cross Rivers": { lat: 4.9517, lng: 8.3220 }
};

export function resolveCoordinatesFromLocationText(locationText) {
  if (!locationText || typeof locationText !== "string") return null;
  const text = locationText.toLowerCase();

  if (text.includes("lagos")) return CITY_COORDS["Lagos"];
  if (text.includes("abuja")) return CITY_COORDS["Abuja"];
  if (text.includes("port harcourt") || text.includes("rivers")) return CITY_COORDS["Port Harcourt"];
  if (text.includes("benin") || text.includes("edo")) return CITY_COORDS["Benin"];
  if (text.includes("delta") || text.includes("warri")) return CITY_COORDS["Delta"];
  if (text.includes("enugu")) return CITY_COORDS["Enugu"];
  if (text.includes("yenagoa") || text.includes("bayelsa")) return CITY_COORDS["Bayelsa"];
  if (text.includes("calabar") || text.includes("cross river") || text.includes("cross rivers")) return CITY_COORDS["Cross Rivers"];
  if (text.includes("kano")) return CITY_COORDS["Kano"];

  return null;
}

export const DEFAULT_TRAVEL_DISTANCE_KM = 25;