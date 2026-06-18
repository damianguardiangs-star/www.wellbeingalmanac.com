export type UserRole = 'admin' | 'field_collector' | 'lab_analyst' | 'commercial_reviewer';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  organisation_id: string;
}

export interface Organisation {
  id: string;
  name: string;
  country: string;
  created_at: string;
}

export type PlantPart = 'flower' | 'leaf' | 'bark' | 'root' | 'resin' | 'seed' | 'wood' | 'whole_plant';
export type FloweringStage = 'pre_bud' | 'bud' | 'early_bloom' | 'full_bloom' | 'post_bloom' | 'fruiting';
export type SourceType = 'wild' | 'cultivated' | 'semi_wild';
export type ExtractionMethod = 'steam_distillation' | 'co2_extraction' | 'ethanol_tincture' | 'enfleurage' | 'solvent_extraction' | 'maceration' | 'cold_press';
export type DetectionMethod = 'gc_ms' | 'gc_fid' | 'hplc' | 'nmr' | 'other';

export interface Species {
  id: string;
  scientific_name: string;
  common_name: string;
  khmer_name: string;
  family: string;
  genus: string;
  description: string;
  native_regions: string[];
  conservation_status: string;
  commercial_importance: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface CollectionSite {
  id: string;
  name: string;
  province: string;
  district: string;
  latitude: number | null;
  longitude: number | null;
  elevation_m: number | null;
  habitat_type: string;
  soil_type: string;
  notes: string;
  created_at: string;
}

export interface PlantSample {
  id: string;
  sample_code: string;
  species_id: string;
  species?: Species;
  collection_site_id: string;
  collection_site?: CollectionSite;
  collector_id: string;
  collector_name: string;
  collected_at: string;
  plant_part: PlantPart;
  flowering_stage: FloweringStage;
  source_type: SourceType;
  quantity_g: number;
  rainfall_mm: number | null;
  temperature_c: number | null;
  humidity_pct: number | null;
  soil_notes: string;
  chain_of_custody: string;
  photo_urls: string[];
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface ExtractionBatch {
  id: string;
  batch_code: string;
  plant_sample_id: string;
  plant_sample?: PlantSample;
  species_id: string;
  species?: Species;
  method: ExtractionMethod;
  raw_weight_g: number;
  final_weight_g: number;
  yield_pct: number;
  duration_hours: number;
  temperature_c: number | null;
  pressure_bar: number | null;
  solvent_used: string | null;
  operator_id: string;
  operator_name: string;
  extraction_date: string;
  output_type: 'essential_oil' | 'absolute' | 'concrete' | 'tincture' | 'co2_extract' | 'resinoid';
  colour: string;
  clarity: string;
  notes: string;
  created_at: string;
}

export interface AromaProfile {
  id: string;
  extraction_batch_id: string;
  extraction_batch?: ExtractionBatch;
  species_id: string;
  species?: Species;
  evaluator_name: string;
  evaluation_date: string;
  top_notes: string[];
  heart_notes: string[];
  base_notes: string[];
  intensity: number;
  longevity: number;
  uniqueness: number;
  luxury_score: number;
  overall_score: number;
  perfumer_notes: string;
  created_at: string;
}

export interface ChemistryResult {
  id: string;
  extraction_batch_id: string;
  extraction_batch?: ExtractionBatch;
  species_id: string;
  species?: Species;
  compound_name: string;
  cas_number: string;
  percentage: number;
  detection_method: DetectionMethod;
  lab_name: string;
  analysis_date: string;
  certificate_url: string | null;
  notes: string;
  created_at: string;
}

export interface CommercialScore {
  id: string;
  species_id: string;
  species?: Species;
  evaluator_name: string;
  evaluation_date: string;
  rarity: number;
  yield_economics: number;
  scent_quality: number;
  supply_scalability: number;
  regulatory_risk: number;
  export_potential: number;
  brand_fit: number;
  overall_score: number;
  market_notes: string;
  created_at: string;
}

export interface AuditLog {
  id: string;
  user_id: string;
  user_name: string;
  action: 'create' | 'update' | 'delete' | 'export' | 'import' | 'login' | 'logout';
  entity_type: string;
  entity_id: string;
  changes: Record<string, unknown>;
  created_at: string;
}

export interface AppState {
  currentUser: User | null;
  species: Species[];
  collectionSites: CollectionSite[];
  plantSamples: PlantSample[];
  extractionBatches: ExtractionBatch[];
  aromaProfiles: AromaProfile[];
  chemistryResults: ChemistryResult[];
  commercialScores: CommercialScore[];
  auditLogs: AuditLog[];
}

export interface FilterState {
  searchQuery: string;
  speciesId: string;
  province: string;
  dateFrom: string;
  dateTo: string;
}
