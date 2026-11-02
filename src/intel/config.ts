import type { CountryCode, Domain } from "./types";

export interface City {
  name: string;
  lat: number;
  lon: number;
}

export interface CountryConfig {
  code: CountryCode;
  name: string;
  /** Alternative names used in matching GDACS / advisory feeds */
  aliases: string[];
  currency: string;
  /** [minLon, minLat, maxLon, maxLat] — used to filter earthquakes */
  bbox: [number, number, number, number];
  cities: City[];
  /** Key exports / imports the commodities agent should watch */
  commodities: string[];
  /** Ports, straits and rivers the maritime agent should watch */
  maritime: string[];
  /** Country-specific geopolitical flashpoints */
  flashpoints: string[];
  /** Adjectives / demonyms that show a headline is about this country */
  demonyms: string[];
}

export const COUNTRIES: CountryConfig[] = [
  {
    code: "ID",
    demonyms: ["Indonesian", "Indonesians"],
    name: "Indonesia",
    aliases: ["Indonesia"],
    currency: "IDR",
    bbox: [94.5, -11.5, 141.5, 6.5],
    cities: [
      { name: "Jakarta", lat: -6.2, lon: 106.85 },
      { name: "Surabaya", lat: -7.25, lon: 112.75 },
      { name: "Denpasar", lat: -8.65, lon: 115.22 },
      { name: "Medan", lat: 3.59, lon: 98.67 },
    ],
    commodities: ["palm oil", "coal", "nickel", "rubber", "tin"],
    maritime: ["Malacca Strait", "Tanjung Priok", "Sunda Strait", "Natuna"],
    flashpoints: ["Natuna", "Papua", "South China Sea"],
  },
  {
    code: "TH",
    demonyms: ["Thai", "Thais"],
    name: "Thailand",
    aliases: ["Thailand"],
    currency: "THB",
    bbox: [97.3, 5.6, 105.7, 20.5],
    cities: [
      { name: "Bangkok", lat: 13.75, lon: 100.5 },
      { name: "Chiang Mai", lat: 18.79, lon: 98.98 },
      { name: "Phuket", lat: 7.88, lon: 98.39 },
      { name: "Pattaya", lat: 12.93, lon: 100.88 },
    ],
    commodities: ["rice", "rubber", "sugar", "cassava"],
    maritime: ["Laem Chabang", "Gulf of Thailand", "Andaman Sea"],
    flashpoints: ["Cambodia border", "Myanmar border", "Deep South"],
  },
  {
    code: "LA",
    demonyms: ["Lao", "Laotian"],
    name: "Laos",
    aliases: ["Laos", "Lao People's Democratic Republic", "Lao PDR"],
    currency: "LAK",
    bbox: [100.0, 13.9, 107.7, 22.5],
    cities: [
      { name: "Vientiane", lat: 17.97, lon: 102.6 },
      { name: "Luang Prabang", lat: 19.89, lon: 102.13 },
      { name: "Pakse", lat: 15.12, lon: 105.8 },
    ],
    commodities: ["electricity exports", "copper", "gold", "rubber"],
    maritime: ["Mekong River", "Laos-China railway", "Vung Ang"],
    flashpoints: ["Golden Triangle", "Mekong dams", "China debt"],
  },
  {
    code: "KH",
    demonyms: ["Cambodian", "Cambodians", "Khmer"],
    name: "Cambodia",
    aliases: ["Cambodia"],
    currency: "KHR",
    bbox: [102.3, 9.9, 107.7, 14.7],
    cities: [
      { name: "Phnom Penh", lat: 11.56, lon: 104.92 },
      { name: "Siem Reap", lat: 13.36, lon: 103.86 },
      { name: "Sihanoukville", lat: 10.63, lon: 103.5 },
    ],
    commodities: ["rice", "garments", "rubber", "cashew"],
    maritime: ["Sihanoukville port", "Ream naval base", "Funan Techo canal", "Mekong River"],
    flashpoints: ["Thailand border", "Ream naval base", "scam compounds"],
  },
  {
    code: "VN",
    demonyms: ["Vietnamese"],
    name: "Vietnam",
    aliases: ["Vietnam", "Viet Nam"],
    currency: "VND",
    bbox: [102.1, 8.4, 109.5, 23.4],
    cities: [
      { name: "Hanoi", lat: 21.03, lon: 105.85 },
      { name: "Ho Chi Minh City", lat: 10.82, lon: 106.63 },
      { name: "Da Nang", lat: 16.05, lon: 108.2 },
      { name: "Hai Phong", lat: 20.86, lon: 106.68 },
    ],
    commodities: ["coffee", "rice", "electronics", "seafood"],
    maritime: ["Hai Phong port", "Cai Mep", "South China Sea", "Paracel"],
    flashpoints: ["South China Sea", "Spratly", "Paracel"],
  },
];

export const COUNTRY_BY_CODE = Object.fromEntries(COUNTRIES.map((c) => [c.code, c])) as Record<
  CountryCode,
  CountryConfig
>;

export interface RoleConfig {
  domain: Domain;
  code: string;
  role: string;
  /** Builds a news search query for the country. Omitted for structured-data agents. */
  query?: (c: CountryConfig) => string;
}

const or = (terms: string[]) => `(${terms.map((t) => (t.includes(" ") ? `"${t}"` : t)).join(" OR ")})`;

/** The 20 specialist roles deployed into every country (19 collectors + 1 fusion lead). */
export const ROLES: RoleConfig[] = [
  { domain: "weather", code: "WX", role: "Weather & severe-conditions watch" },
  { domain: "air", code: "AQ", role: "Air quality & haze monitor" },
  { domain: "seismic", code: "SEI", role: "Earthquake & volcano monitor" },
  { domain: "disaster", code: "DIS", role: "Disaster alerts (floods, cyclones, fires)" },
  {
    domain: "crime",
    code: "CRM",
    role: "Crime & policing",
    query: (c) => `${c.name} ${or(["crime", "police", "arrested", "robbery", "murder", "drug bust"])}`,
  },
  {
    domain: "security",
    code: "SEC",
    role: "Terrorism, insurgency & security",
    query: (c) => `${c.name} ${or(["bomb", "terror", "insurgent", "militant", "military", "security forces"])}`,
  },
  {
    domain: "politics",
    code: "POL",
    role: "Domestic politics",
    query: (c) => `${c.name} ${or(["prime minister", "president", "parliament", "election", "government", "court ruling"])}`,
  },
  {
    domain: "geopolitics",
    code: "GEO",
    role: "Geopolitics & foreign relations",
    query: (c) => `${c.name} ${or([...c.flashpoints, "China", "United States", "ASEAN", "sanctions"])}`,
  },
  {
    domain: "unrest",
    code: "UNR",
    role: "Protests & civil unrest",
    query: (c) => `${c.name} ${or(["protest", "rally", "demonstration", "strike", "clashes", "riot"])}`,
  },
  {
    domain: "commodities",
    code: "COM",
    role: "Commodity prices & supply",
    query: (c) => `${c.name} ${or(c.commodities)} ${or(["price", "export", "supply", "ban"])}`,
  },
  { domain: "currency", code: "FX", role: "Currency & FX moves" },
  {
    domain: "maritime",
    code: "MAR",
    role: "Shipping routes & maritime",
    query: (c) => `${or(c.maritime)} ${or(["shipping", "port", "vessel", "cargo", "coast guard", "freight"])}`,
  },
  {
    domain: "aviation",
    code: "AVN",
    role: "Aviation & transport disruption",
    query: (c) => `${c.name} ${or(["flights cancelled", "airport", "airline", "train", "road closure", "ferry"])}`,
  },
  { domain: "advisory", code: "ADV", role: "Government travel advisories" },
  {
    domain: "students",
    code: "STU",
    role: "Student & youth traveller safety",
    query: (c) =>
      `${c.name} ${or(["students", "student visa", "backpacker", "tourist scam", "tourists warned", "exchange students", "university"])}`,
  },
  {
    domain: "health",
    code: "HLT",
    role: "Health & outbreaks",
    query: (c) => `${c.name} ${or(["dengue", "outbreak", "cholera", "rabies", "bird flu", "methanol poisoning", "hospital"])}`,
  },
  {
    domain: "economy",
    code: "ECO",
    role: "Economy, trade & tariffs",
    query: (c) => `${c.name} ${or(["economy", "tariff", "inflation", "central bank", "GDP", "investment"])}`,
  },
  {
    domain: "cyber",
    code: "CYB",
    role: "Cyber, fraud & scam centres",
    query: (c) => `${c.name} ${or(["scam centre", "scam compound", "cyberattack", "data breach", "hackers", "online fraud"])}`,
  },
  {
    domain: "infrastructure",
    code: "INF",
    role: "Infrastructure, power & borders",
    query: (c) => `${c.name} ${or(["blackout", "power outage", "border closed", "border crossing", "dam", "bridge collapse", "landslide"])}`,
  },
  { domain: "fusion", code: "LEAD", role: "Country fusion lead (correlates the other 19)" },
];

export const DOMAIN_LABEL: Record<Domain, string> = {
  weather: "Weather",
  air: "Air quality",
  seismic: "Seismic",
  disaster: "Disasters",
  crime: "Crime",
  security: "Security",
  politics: "Politics",
  geopolitics: "Geopolitics",
  unrest: "Unrest",
  commodities: "Commodities",
  currency: "Currency",
  maritime: "Shipping",
  aviation: "Transport",
  advisory: "Advisories",
  students: "Students",
  health: "Health",
  economy: "Economy",
  cyber: "Cyber/Scams",
  infrastructure: "Infrastructure",
  fusion: "Fusion",
};

/** How much each domain weighs in a country's overall risk score. */
export const DOMAIN_WEIGHT: Record<Domain, number> = {
  weather: 1,
  air: 0.6,
  seismic: 1.2,
  disaster: 1.4,
  crime: 1,
  security: 1.5,
  politics: 0.8,
  geopolitics: 1,
  unrest: 1.3,
  commodities: 0.6,
  currency: 0.5,
  maritime: 0.8,
  aviation: 0.8,
  advisory: 1.5,
  students: 1.2,
  health: 1,
  economy: 0.5,
  cyber: 0.9,
  infrastructure: 1,
  fusion: 0,
};
