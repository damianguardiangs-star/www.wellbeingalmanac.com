-- ============================================================
-- Khmere Botanical Intelligence — Database Schema
-- Supabase PostgreSQL
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ────────────────────────────────────────────────────────────
-- ENUMS
-- ────────────────────────────────────────────────────────────

CREATE TYPE user_role AS ENUM ('admin', 'field_collector', 'lab_analyst', 'commercial_reviewer');
CREATE TYPE plant_part AS ENUM ('flower', 'leaf', 'bark', 'root', 'resin', 'seed', 'wood', 'whole_plant');
CREATE TYPE flowering_stage AS ENUM ('pre_bud', 'bud', 'early_bloom', 'full_bloom', 'post_bloom', 'fruiting');
CREATE TYPE source_type AS ENUM ('wild', 'cultivated', 'semi_wild');
CREATE TYPE extraction_method AS ENUM ('steam_distillation', 'co2_extraction', 'ethanol_tincture', 'enfleurage', 'solvent_extraction', 'maceration', 'cold_press');
CREATE TYPE output_type AS ENUM ('essential_oil', 'absolute', 'concrete', 'tincture', 'co2_extract', 'resinoid');
CREATE TYPE detection_method AS ENUM ('gc_ms', 'gc_fid', 'hplc', 'nmr', 'other');
CREATE TYPE audit_action AS ENUM ('create', 'update', 'delete', 'export', 'import', 'login', 'logout');

-- ────────────────────────────────────────────────────────────
-- ORGANISATIONS
-- ────────────────────────────────────────────────────────────

CREATE TABLE organisations (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  country     TEXT NOT NULL DEFAULT 'Cambodia',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────
-- USERS (extends Supabase auth.users)
-- ────────────────────────────────────────────────────────────

CREATE TABLE users (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organisation_id UUID REFERENCES organisations(id),
  name            TEXT NOT NULL,
  role            user_role NOT NULL DEFAULT 'field_collector',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────
-- SPECIES
-- ────────────────────────────────────────────────────────────

CREATE TABLE species (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  scientific_name       TEXT NOT NULL,
  common_name           TEXT NOT NULL,
  khmer_name            TEXT NOT NULL DEFAULT '',
  family                TEXT NOT NULL,
  genus                 TEXT NOT NULL,
  description           TEXT NOT NULL DEFAULT '',
  native_regions        TEXT[] NOT NULL DEFAULT '{}',
  conservation_status   TEXT NOT NULL DEFAULT 'Least Concern',
  commercial_importance TEXT NOT NULL DEFAULT '',
  notes                 TEXT NOT NULL DEFAULT '',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX species_scientific_name_idx ON species(scientific_name);

-- ────────────────────────────────────────────────────────────
-- COLLECTION SITES
-- ────────────────────────────────────────────────────────────

CREATE TABLE collection_sites (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name         TEXT NOT NULL,
  province     TEXT NOT NULL,
  district     TEXT NOT NULL DEFAULT '',
  latitude     NUMERIC(9, 6),
  longitude    NUMERIC(9, 6),
  elevation_m  INTEGER,
  habitat_type TEXT NOT NULL DEFAULT '',
  soil_type    TEXT NOT NULL DEFAULT '',
  notes        TEXT NOT NULL DEFAULT '',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX collection_sites_province_idx ON collection_sites(province);

-- ────────────────────────────────────────────────────────────
-- PLANT SAMPLES
-- ────────────────────────────────────────────────────────────

CREATE TABLE plant_samples (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sample_code         TEXT NOT NULL UNIQUE,
  species_id          UUID NOT NULL REFERENCES species(id),
  collection_site_id  UUID NOT NULL REFERENCES collection_sites(id),
  collector_id        UUID REFERENCES users(id),
  collector_name      TEXT NOT NULL,
  collected_at        TIMESTAMPTZ NOT NULL,
  plant_part          plant_part NOT NULL,
  flowering_stage     flowering_stage NOT NULL,
  source_type         source_type NOT NULL DEFAULT 'cultivated',
  quantity_g          NUMERIC(10, 2) NOT NULL,
  rainfall_mm         NUMERIC(6, 1),
  temperature_c       NUMERIC(5, 1),
  humidity_pct        NUMERIC(5, 1),
  soil_notes          TEXT NOT NULL DEFAULT '',
  chain_of_custody    TEXT NOT NULL DEFAULT '',
  photo_urls          TEXT[] NOT NULL DEFAULT '{}',
  notes               TEXT NOT NULL DEFAULT '',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX plant_samples_species_idx ON plant_samples(species_id);
CREATE INDEX plant_samples_site_idx ON plant_samples(collection_site_id);
CREATE INDEX plant_samples_collected_idx ON plant_samples(collected_at DESC);

-- ────────────────────────────────────────────────────────────
-- EXTRACTION BATCHES
-- ────────────────────────────────────────────────────────────

CREATE TABLE extraction_batches (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  batch_code        TEXT NOT NULL UNIQUE,
  plant_sample_id   UUID REFERENCES plant_samples(id),
  species_id        UUID NOT NULL REFERENCES species(id),
  method            extraction_method NOT NULL,
  raw_weight_g      NUMERIC(10, 2) NOT NULL,
  final_weight_g    NUMERIC(10, 3) NOT NULL,
  yield_pct         NUMERIC(8, 4) NOT NULL GENERATED ALWAYS AS (
                      CASE WHEN raw_weight_g > 0 THEN (final_weight_g / raw_weight_g) * 100 ELSE 0 END
                    ) STORED,
  duration_hours    NUMERIC(6, 2) NOT NULL,
  temperature_c     NUMERIC(5, 1),
  pressure_bar      NUMERIC(5, 2),
  solvent_used      TEXT,
  operator_id       UUID REFERENCES users(id),
  operator_name     TEXT NOT NULL,
  extraction_date   DATE NOT NULL,
  output_type       output_type NOT NULL,
  colour            TEXT NOT NULL DEFAULT '',
  clarity           TEXT NOT NULL DEFAULT '',
  notes             TEXT NOT NULL DEFAULT '',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX extraction_batches_species_idx ON extraction_batches(species_id);
CREATE INDEX extraction_batches_date_idx ON extraction_batches(extraction_date DESC);

-- ────────────────────────────────────────────────────────────
-- AROMA PROFILES
-- ────────────────────────────────────────────────────────────

CREATE TABLE aroma_profiles (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  extraction_batch_id   UUID REFERENCES extraction_batches(id),
  species_id            UUID NOT NULL REFERENCES species(id),
  evaluator_name        TEXT NOT NULL,
  evaluation_date       DATE NOT NULL,
  top_notes             TEXT[] NOT NULL DEFAULT '{}',
  heart_notes           TEXT[] NOT NULL DEFAULT '{}',
  base_notes            TEXT[] NOT NULL DEFAULT '{}',
  intensity             SMALLINT NOT NULL CHECK (intensity BETWEEN 1 AND 10),
  longevity             SMALLINT NOT NULL CHECK (longevity BETWEEN 1 AND 10),
  uniqueness            SMALLINT NOT NULL CHECK (uniqueness BETWEEN 1 AND 10),
  luxury_score          SMALLINT NOT NULL CHECK (luxury_score BETWEEN 1 AND 10),
  overall_score         NUMERIC(4, 2) NOT NULL,
  perfumer_notes        TEXT NOT NULL DEFAULT '',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX aroma_profiles_species_idx ON aroma_profiles(species_id);
CREATE INDEX aroma_profiles_date_idx ON aroma_profiles(evaluation_date DESC);

-- ────────────────────────────────────────────────────────────
-- CHEMISTRY RESULTS (GC-MS)
-- ────────────────────────────────────────────────────────────

CREATE TABLE chemistry_results (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  extraction_batch_id   UUID REFERENCES extraction_batches(id),
  species_id            UUID NOT NULL REFERENCES species(id),
  compound_name         TEXT NOT NULL,
  cas_number            TEXT NOT NULL DEFAULT '',
  percentage            NUMERIC(6, 3) NOT NULL,
  detection_method      detection_method NOT NULL DEFAULT 'gc_ms',
  lab_name              TEXT NOT NULL,
  analysis_date         DATE NOT NULL,
  certificate_url       TEXT,
  notes                 TEXT NOT NULL DEFAULT '',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX chemistry_results_species_idx ON chemistry_results(species_id);
CREATE INDEX chemistry_results_compound_idx ON chemistry_results(compound_name);
CREATE INDEX chemistry_results_batch_idx ON chemistry_results(extraction_batch_id);

-- ────────────────────────────────────────────────────────────
-- COMMERCIAL SCORES
-- ────────────────────────────────────────────────────────────

CREATE TABLE commercial_scores (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  species_id          UUID NOT NULL REFERENCES species(id),
  evaluator_name      TEXT NOT NULL,
  evaluation_date     DATE NOT NULL,
  rarity              SMALLINT NOT NULL CHECK (rarity BETWEEN 1 AND 10),
  yield_economics     SMALLINT NOT NULL CHECK (yield_economics BETWEEN 1 AND 10),
  scent_quality       SMALLINT NOT NULL CHECK (scent_quality BETWEEN 1 AND 10),
  supply_scalability  SMALLINT NOT NULL CHECK (supply_scalability BETWEEN 1 AND 10),
  regulatory_risk     SMALLINT NOT NULL CHECK (regulatory_risk BETWEEN 1 AND 10),
  export_potential    SMALLINT NOT NULL CHECK (export_potential BETWEEN 1 AND 10),
  brand_fit           SMALLINT NOT NULL CHECK (brand_fit BETWEEN 1 AND 10),
  overall_score       NUMERIC(4, 2) NOT NULL,
  market_notes        TEXT NOT NULL DEFAULT '',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX commercial_scores_species_idx ON commercial_scores(species_id);

-- ────────────────────────────────────────────────────────────
-- DOCUMENTS
-- ────────────────────────────────────────────────────────────

CREATE TABLE documents (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_type   TEXT NOT NULL,
  entity_id     UUID NOT NULL,
  filename      TEXT NOT NULL,
  storage_path  TEXT NOT NULL,
  mime_type     TEXT NOT NULL,
  file_size_kb  INTEGER,
  uploaded_by   UUID REFERENCES users(id),
  notes         TEXT NOT NULL DEFAULT '',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX documents_entity_idx ON documents(entity_type, entity_id);

-- ────────────────────────────────────────────────────────────
-- AUDIT LOGS
-- ────────────────────────────────────────────────────────────

CREATE TABLE audit_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES users(id),
  user_name   TEXT NOT NULL,
  action      audit_action NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id   TEXT NOT NULL,
  changes     JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX audit_logs_user_idx ON audit_logs(user_id);
CREATE INDEX audit_logs_entity_idx ON audit_logs(entity_type, entity_id);
CREATE INDEX audit_logs_created_idx ON audit_logs(created_at DESC);

-- ────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ────────────────────────────────────────────────────────────

ALTER TABLE organisations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE species ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE plant_samples ENABLE ROW LEVEL SECURITY;
ALTER TABLE extraction_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE aroma_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE chemistry_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE commercial_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read all data within their organisation
CREATE POLICY "authenticated_read_species"
  ON species FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_read_samples"
  ON plant_samples FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_read_extractions"
  ON extraction_batches FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_read_aroma"
  ON aroma_profiles FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_read_chemistry"
  ON chemistry_results FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_read_commercial"
  ON commercial_scores FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_read_sites"
  ON collection_sites FOR SELECT TO authenticated USING (true);

-- Write access: admins and lab analysts can write species/extractions
CREATE POLICY "admin_lab_write_species"
  ON species FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'lab_analyst')
  ));

-- Field collectors can write samples
CREATE POLICY "collector_write_samples"
  ON plant_samples FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'field_collector')
  ));

-- Lab analysts can write extraction batches, aroma profiles, chemistry
CREATE POLICY "lab_write_extractions"
  ON extraction_batches FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'lab_analyst')
  ));

-- Only admins can delete anything
CREATE POLICY "admin_delete_samples"
  ON plant_samples FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- Users can read their own audit logs; admins read all
CREATE POLICY "audit_logs_read"
  ON audit_logs FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  ));

-- ────────────────────────────────────────────────────────────
-- UPDATED_AT TRIGGER
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER species_updated_at
  BEFORE UPDATE ON species
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER plant_samples_updated_at
  BEFORE UPDATE ON plant_samples
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
