/**
 * Offline gazetteer used to put news reports on the map. Headlines are matched
 * against these place names (longest match wins); if no place is named, the
 * report falls back to the country centroid and is drawn as "approximate".
 */
import type { CountryCode } from "./types";

export type GeoPrecision = "exact" | "place" | "country";

export interface Place {
  name: string;
  country: CountryCode;
  lat: number;
  lon: number;
}

export const COUNTRY_CENTROID: Record<CountryCode, [number, number]> = {
  ID: [-2.5, 118.0],
  TH: [15.5, 101.0],
  LA: [19.2, 102.6],
  KH: [12.6, 104.9],
  VN: [16.2, 107.3],
};

type Row = [string, number, number];

const RAW: Record<CountryCode, Row[]> = {
  ID: [
    ["Jakarta", -6.2, 106.85], ["Surabaya", -7.25, 112.75], ["Bandung", -6.91, 107.61], ["Medan", 3.59, 98.67],
    ["Semarang", -6.97, 110.42], ["Yogyakarta", -7.8, 110.37], ["Denpasar", -8.65, 115.22], ["Bali", -8.4, 115.19],
    ["Makassar", -5.14, 119.42], ["Palembang", -2.99, 104.76], ["Banda Aceh", 5.55, 95.32], ["Aceh", 4.7, 96.75],
    ["Papua", -4.27, 138.08], ["Jayapura", -2.53, 140.72], ["Lombok", -8.65, 116.32], ["Sumatra", 0.5, 101.5],
    ["Java", -7.3, 110.0], ["Kalimantan", 0.0, 114.0], ["Borneo", 0.0, 114.0], ["Sulawesi", -2.0, 120.5],
    ["Nusantara", -0.97, 116.7], ["Natuna", 3.93, 108.38], ["Batam", 1.08, 104.03], ["Riau", 0.5, 101.45],
    ["Malacca Strait", 2.5, 101.0], ["Strait of Malacca", 2.5, 101.0], ["Sunda Strait", -6.0, 105.8],
    ["Tanjung Priok", -6.1, 106.88], ["Maluku", -3.24, 130.15], ["Ambon", -3.7, 128.18], ["Merapi", -7.54, 110.45],
    ["Semeru", -8.11, 112.92], ["Lewotobi", -8.54, 122.78], ["Flores", -8.65, 121.08], ["Manado", 1.47, 124.84],
    ["Pekanbaru", 0.51, 101.45], ["Padang", -0.95, 100.35], ["Balikpapan", -1.27, 116.83], ["Bogor", -6.6, 106.8],
    ["Tangerang", -6.18, 106.63], ["Bekasi", -6.24, 106.99], ["Malang", -7.98, 112.63], ["Solo", -7.57, 110.82],
    ["Pontianak", -0.03, 109.33], ["Samarinda", -0.5, 117.15], ["Kupang", -10.18, 123.6], ["Sorong", -0.88, 131.25],
  ],
  TH: [
    ["Bangkok", 13.75, 100.5], ["Chiang Mai", 18.79, 98.98], ["Chiang Rai", 19.91, 99.83], ["Phuket", 7.88, 98.39],
    ["Pattaya", 12.93, 100.88], ["Krabi", 8.09, 98.91], ["Koh Samui", 9.51, 100.01], ["Koh Phangan", 9.73, 100.03],
    ["Hat Yai", 7.01, 100.47], ["Songkhla", 7.19, 100.6], ["Pattani", 6.87, 101.25], ["Yala", 6.54, 101.28],
    ["Narathiwat", 6.43, 101.82], ["Deep South", 6.6, 101.4], ["Khon Kaen", 16.43, 102.84], ["Udon Thani", 17.41, 102.79],
    ["Nong Khai", 17.88, 102.74], ["Mae Sot", 16.71, 98.57], ["Tak", 16.87, 99.13], ["Surin", 14.88, 103.49],
    ["Sisaket", 15.12, 104.32], ["Si Sa Ket", 15.12, 104.32], ["Buriram", 14.99, 103.1], ["Ubon Ratchathani", 15.24, 104.85],
    ["Sa Kaeo", 13.82, 102.07], ["Aranyaprathet", 13.69, 102.5], ["Trat", 12.24, 102.51], ["Chanthaburi", 12.61, 102.1],
    ["Ayutthaya", 14.35, 100.57], ["Laem Chabang", 13.08, 100.88], ["Suvarnabhumi", 13.69, 100.75],
    ["Don Mueang", 13.91, 100.6], ["Hua Hin", 12.57, 99.96], ["Korat", 14.97, 102.1], ["Nakhon Ratchasima", 14.97, 102.1],
    ["Gulf of Thailand", 10.5, 101.5], ["Andaman Sea", 8.5, 97.0], ["Ta Muen Thom", 14.35, 103.27],
    ["Mae Hong Son", 19.3, 97.97], ["Nakhon Si Thammarat", 8.43, 99.96], ["Surat Thani", 9.14, 99.33],
    ["Phitsanulok", 16.82, 100.26], ["Rayong", 12.68, 101.28], ["Chonburi", 13.36, 100.98], ["Mukdahan", 16.54, 104.72],
  ],
  LA: [
    ["Vientiane", 17.97, 102.6], ["Luang Prabang", 19.89, 102.13], ["Pakse", 15.12, 105.8], ["Savannakhet", 16.55, 104.75],
    ["Thakhek", 17.4, 104.8], ["Vang Vieng", 18.92, 102.45], ["Bokeo", 20.3, 100.6], ["Golden Triangle", 20.35, 100.08],
    ["Boten", 21.18, 101.67], ["Luang Namtha", 20.95, 101.4], ["Oudomxay", 20.69, 101.99], ["Phongsaly", 21.68, 102.1],
    ["Xieng Khouang", 19.45, 103.2], ["Phonsavan", 19.45, 103.2], ["Attapeu", 14.8, 106.83], ["Champasak", 14.9, 105.87],
    ["Sekong", 15.35, 106.72], ["Houaphanh", 20.42, 104.05], ["Sam Neua", 20.42, 104.05], ["Xayaburi", 19.25, 101.71],
    ["Sainyabuli", 19.25, 101.71], ["Khammouane", 17.4, 104.8], ["Laos-China railway", 19.9, 102.2],
    ["Nam Theun", 17.6, 105.0], ["Salavan", 15.72, 106.42], ["Bolikhamxai", 18.38, 103.65], ["Xaisomboun", 18.9, 102.9],
  ],
  KH: [
    ["Phnom Penh", 11.56, 104.92], ["Siem Reap", 13.36, 103.86], ["Angkor", 13.41, 103.87], ["Sihanoukville", 10.63, 103.5],
    ["Battambang", 13.1, 103.2], ["Poipet", 13.66, 102.56], ["Kampot", 10.61, 104.18], ["Koh Kong", 11.62, 102.98],
    ["Ream", 10.5, 103.6], ["Preah Vihear", 14.39, 104.68], ["Oddar Meanchey", 14.18, 103.5],
    ["Banteay Meanchey", 13.75, 102.99], ["Pursat", 12.54, 103.92], ["Kampong Cham", 12.0, 105.46], ["Kratie", 12.49, 106.02],
    ["Stung Treng", 13.53, 105.97], ["Ratanakiri", 13.74, 106.98], ["Mondulkiri", 12.45, 107.2], ["Svay Rieng", 11.09, 105.8],
    ["Bavet", 11.07, 106.13], ["Takeo", 10.99, 104.78], ["Tonle Sap", 12.9, 104.1], ["Funan Techo", 11.2, 104.9],
    ["O'Smach", 14.43, 103.7], ["Pailin", 12.85, 102.61], ["Kandal", 11.22, 104.98], ["Prey Veng", 11.48, 105.33],
  ],
  VN: [
    ["Hanoi", 21.03, 105.85], ["Ho Chi Minh City", 10.82, 106.63], ["Saigon", 10.82, 106.63], ["Da Nang", 16.05, 108.2],
    ["Hai Phong", 20.86, 106.68], ["Haiphong", 20.86, 106.68], ["Hue", 16.46, 107.59], ["Nha Trang", 12.24, 109.19],
    ["Hoi An", 15.88, 108.33], ["Can Tho", 10.03, 105.79], ["Quang Ninh", 21.0, 107.3], ["Ha Long", 20.95, 107.08],
    ["Halong", 20.95, 107.08], ["Lao Cai", 22.48, 103.97], ["Sapa", 22.34, 103.84], ["Ha Giang", 22.82, 104.98],
    ["Cao Bang", 22.67, 106.26], ["Lang Son", 21.85, 106.76], ["Yen Bai", 21.72, 104.9], ["Thai Nguyen", 21.59, 105.84],
    ["Nghe An", 18.9, 105.0], ["Vinh", 18.68, 105.68], ["Ha Tinh", 18.34, 105.9], ["Vung Ang", 18.1, 106.4],
    ["Quang Binh", 17.47, 106.6], ["Quang Tri", 16.75, 107.19], ["Quang Ngai", 15.12, 108.8], ["Quang Nam", 15.57, 108.0],
    ["Quy Nhon", 13.78, 109.22], ["Binh Dinh", 14.1, 108.9], ["Phu Quoc", 10.23, 103.96], ["Mekong Delta", 10.0, 105.8],
    ["Dak Lak", 12.67, 108.04], ["Da Lat", 11.94, 108.44], ["Dalat", 11.94, 108.44], ["Cai Mep", 10.53, 107.03],
    ["Vung Tau", 10.35, 107.08], ["Binh Duong", 11.0, 106.65], ["Dong Nai", 10.95, 106.82], ["Thanh Hoa", 19.8, 105.78],
    ["Nam Dinh", 20.42, 106.17], ["Dien Bien", 21.39, 103.02], ["Son La", 21.33, 103.9], ["Gia Lai", 13.98, 108.0],
    ["Paracel", 16.5, 112.0], ["Spratly", 10.0, 114.0], ["South China Sea", 13.0, 113.0], ["East Sea", 13.0, 113.0],
  ],
};

export const PLACES: Place[] = (Object.entries(RAW) as [CountryCode, Row[]][])
  .flatMap(([country, rows]) => rows.map(([name, lat, lon]) => ({ name, country, lat, lon })))
  // Longest names first so "Banda Aceh" beats "Aceh" and "Ho Chi Minh City" beats shorter overlaps.
  .sort((a, b) => b.name.length - a.name.length);

const PATTERNS = PLACES.map((p) => {
  const escaped = p.name.replace(/[.*+?^${}()|[\]\\']/g, "\\$&").replace(/ /g, "[\\s-]+");
  // Short names (Hue, Yala, Tak…) must match case-sensitively to avoid false hits on ordinary words.
  return { p, re: new RegExp(`\\b${escaped}\\b`, p.name.length <= 4 ? "" : "i") };
});

/** Border stories that name the neighbour but no town are pinned to the shared border. */
const BORDER_ROWS: [CountryCode, RegExp, string, number, number][] = [
  ["TH", /cambodia|khmer/i, "Thai–Cambodian border", 14.3, 103.3],
  ["KH", /thailand|\bthai\b/i, "Thai–Cambodian border", 14.3, 103.3],
  ["TH", /laos|\blao\b/i, "Thai–Lao border (Mekong)", 17.9, 102.7],
  ["LA", /thailand|\bthai\b/i, "Thai–Lao border (Mekong)", 17.9, 102.7],
  ["TH", /myanmar|burm/i, "Thai–Myanmar border", 16.7, 98.6],
  ["LA", /myanmar|burm/i, "Lao–Myanmar border (Golden Triangle)", 20.35, 100.1],
  ["LA", /china|chinese/i, "Lao–China border (Boten)", 21.18, 101.67],
  ["LA", /vietnam|viet nam/i, "Lao–Vietnam border", 18.6, 105.2],
  ["VN", /laos|\blao\b/i, "Lao–Vietnam border", 18.6, 105.2],
  ["VN", /china|chinese/i, "Vietnam–China border", 21.85, 106.76],
  ["VN", /cambodia/i, "Cambodia–Vietnam border (Bavet/Moc Bai)", 11.07, 106.13],
  ["KH", /vietnam|viet nam/i, "Cambodia–Vietnam border (Bavet/Moc Bai)", 11.07, 106.13],
  ["KH", /laos|\blao\b/i, "Cambodia–Laos border", 14.0, 106.0],
  ["LA", /cambodia/i, "Cambodia–Laos border", 14.0, 106.0],
  ["ID", /malaysia/i, "Indonesia–Malaysia border (Borneo)", 1.5, 112.0],
  ["ID", /timor/i, "Indonesia–Timor-Leste border", -9.2, 124.9],
  ["ID", /papua new guinea|\bPNG\b/, "Indonesia–PNG border", -4.5, 141.0],
];
const BORDERS = BORDER_ROWS.map(([home, re, label, lat, lon]) => ({ home, re, label, lat, lon }));

export interface GeoFix {
  lat: number;
  lon: number;
  geo: GeoPrecision;
  place?: string;
}

/** Locate a piece of text. Prefers places in `home`, then anywhere in the region, then the home centroid. */
export function geocode(text: string, home: CountryCode): GeoFix {
  let best: Place | undefined;
  for (const { p, re } of PATTERNS) {
    if (!re.test(text)) continue;
    if (p.country === home) {
      best = p;
      break;
    }
    best ??= p;
  }
  if (best) return { lat: best.lat, lon: best.lon, geo: "place", place: best.name };
  if (/\bborder/i.test(text)) {
    for (const b of BORDERS) {
      if (b.home === home && b.re.test(text)) return { lat: b.lat, lon: b.lon, geo: "place", place: b.label };
    }
  }
  const [lat, lon] = COUNTRY_CENTROID[home];
  return { lat, lon, geo: "country" };
}
