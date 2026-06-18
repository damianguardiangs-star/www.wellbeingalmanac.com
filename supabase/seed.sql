-- ============================================================
-- Khmere Botanical Intelligence — Seed Data
-- Run after schema.sql
-- ============================================================

-- Organisation
INSERT INTO organisations (id, name, country)
VALUES ('00000000-0000-0000-0000-000000000001', 'Khmere Botanical Intelligence', 'Cambodia');

-- Species
INSERT INTO species (id, scientific_name, common_name, khmer_name, family, genus, description, native_regions, conservation_status, commercial_importance, notes) VALUES
(
  '00000000-0000-0000-0001-000000000001',
  'Mitrella mesnyi', 'Rumduol', 'ក្រមួន', 'Annonaceae', 'Mitrella',
  'Cambodia''s national flower. A small evergreen tree bearing delicate yellow-cream flowers with an intensely sweet, nocturnal fragrance.',
  ARRAY['Cambodia', 'Thailand', 'Vietnam', 'Laos'],
  'Vulnerable',
  'Critical — national symbol with unique scent profile unmatched globally',
  'Blooms primarily at night; harvest window 20:00–04:00 for peak aromatic compounds.'
),
(
  '00000000-0000-0000-0001-000000000002',
  'Nelumbo nucifera', 'Sacred Lotus', 'ផ្កាប្ដំ', 'Nelumbonaceae', 'Nelumbo',
  'The sacred pink and white lotus holds deep spiritual significance across Cambodia.',
  ARRAY['Cambodia', 'India', 'China', 'Thailand', 'Vietnam'],
  'Least Concern',
  'High — spiritual premium market, luxury perfumery, wellness export',
  'Harvested at dawn before fully opening. Pink variety yields higher aromatic concentration.'
),
(
  '00000000-0000-0000-0001-000000000003',
  'Cananga odorata', 'Ylang-Ylang', 'ក្លាំងខ្លឹម', 'Annonaceae', 'Cananga',
  'Tropical tree producing drooping yellow flowers with intensely sweet, banana-floral and rubbery scent.',
  ARRAY['Cambodia', 'Philippines', 'Indonesia', 'Comoros', 'Madagascar'],
  'Least Concern',
  'Very High — established global market, high yield economics',
  'Early morning harvest (05:00–08:00) gives highest linalool fraction.'
),
(
  '00000000-0000-0000-0001-000000000004',
  'Styrax tonkinensis', 'Siam Benzoin', 'ស្ត្រុការ', 'Styracaceae', 'Styrax',
  'Medium tree producing a balsamic resin through bark tapping with warm vanilla-balsam character.',
  ARRAY['Cambodia', 'Laos', 'Vietnam', 'China (Yunnan)', 'Thailand'],
  'Near Threatened',
  'High — resin-based revenue, long shelf life, premium incense market',
  'Trees must be 7–10 years old before tapping. First tapping yields highest quality head resin.'
),
(
  '00000000-0000-0000-0001-000000000005',
  'Pogostemon cablin', 'Patchouli', 'ប៉ាចូលី', 'Lamiaceae', 'Pogostemon',
  'Herbaceous perennial shrub with distinctive earthy, musky, slightly sweet scent.',
  ARRAY['Cambodia', 'Indonesia', 'India', 'Philippines', 'Malaysia'],
  'Least Concern',
  'Very High — global commodity with strong Cambodia growth opportunity',
  'Dried leaves preferred for distillation. Fermentation increases patchoulol content.'
),
(
  '00000000-0000-0000-0001-000000000006',
  'Coccinia grandis', 'Ivy Gourd', 'ប្រែក', 'Cucurbitaceae', 'Coccinia',
  'Climbing vine with white flowers and red fruit containing volatile aromatic compounds of interest to natural perfumers.',
  ARRAY['Cambodia', 'India', 'Southeast Asia', 'Africa'],
  'Least Concern',
  'Exploratory — niche green-floral accord potential',
  'Highly underresearched as fragrance plant. Initial GC-MS shows interesting nonanal fraction.'
);

-- Collection Sites
INSERT INTO collection_sites (id, name, province, district, latitude, longitude, elevation_m, habitat_type, soil_type, notes) VALUES
(
  '00000000-0000-0000-0002-000000000001',
  'Siem Reap Temple Gardens', 'Siem Reap', 'Angkor',
  13.4125, 103.8670, 35, 'Cultivated garden / temple grounds', 'Sandy loam, well-drained',
  'Access requires coordination with APSARA authority.'
),
(
  '00000000-0000-0000-0002-000000000002',
  'Tonle Sap Southern Margin', 'Kampong Chhnang', 'Rolea B''ier',
  12.2508, 104.6670, 8, 'Wetland / floating village perimeter', 'Rich alluvial silt',
  'Seasonal access. Lotus harvest possible January–April.'
),
(
  '00000000-0000-0000-0002-000000000003',
  'Mondulkiri Highland Reserve', 'Mondulkiri', 'Sen Monorom',
  12.4619, 107.1878, 890, 'Highland evergreen forest', 'Laterite, slightly acidic',
  'Protected area. Bunong community partnership for ethical collection.'
),
(
  '00000000-0000-0000-0002-000000000004',
  'Kampot Upland Farm', 'Kampot', 'Kampot',
  10.5949, 104.1668, 120, 'Mixed cultivation / hillside farm', 'Sandy clay, volcanic influence',
  'Partner farm. Same microclimate as premium Kampot pepper.'
),
(
  '00000000-0000-0000-0002-000000000005',
  'Phnom Penh Botanical Station', 'Phnom Penh', 'Chamkarmon',
  11.5449, 104.9282, 12, 'Research station / controlled garden', 'Composted clay loam',
  'Royal University of Agriculture experimental plot.'
);
