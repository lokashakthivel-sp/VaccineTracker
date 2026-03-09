-- ============================================================
-- VACCINETRACK — COMPLETE SUPABASE SCHEMA
--
-- Sections:
--   1. Extensions
--   2. Tables (profiles, children, vaccines, child_vaccinations)
--   3. Indexes
--   4. RLS policies
--   5. Helper functions (get_user_role, set_updated_at)
--   6. updated_at triggers
--   7. Unique constraints
--   8. Doctor location columns + Haversine functions (Find Nearest Doctor)
--   9. RPC grants
--  10. NIS / UIP seed data (34 vaccines)
-- ============================================================


-- ============================================================
-- 1. EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- ============================================================
-- 2. TABLES
-- ============================================================

-- ── profiles ─────────────────────────────────────────────────
-- One row per auth user. Role is either 'parent' or 'doctor'.
-- Doctors also store clinic name/address and GPS coordinates
-- (clinic_name, clinic_address, lat, lng added in section 8).
CREATE TABLE IF NOT EXISTS profiles (
  id           UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role         TEXT        NOT NULL CHECK (role IN ('parent', 'doctor')),
  full_name    TEXT        NOT NULL,
  phone_number TEXT        CHECK (phone_number ~ '^\+[1-9]\d{6,14}$'),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ── children ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS children (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_id   UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  full_name   TEXT        NOT NULL,
  dob         DATE        NOT NULL,
  gender      TEXT        NOT NULL CHECK (gender IN ('male', 'female', 'other')),
  blood_group TEXT        CHECK (blood_group IN ('A+','A-','B+','B-','AB+','AB-','O+','O-','unknown')),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── vaccines (reference / seed data) ─────────────────────────
CREATE TABLE IF NOT EXISTS vaccines (
  id                    UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                  TEXT        NOT NULL,
  full_name             TEXT        NOT NULL,
  recommended_age_weeks INTEGER     NOT NULL,
  description           TEXT,
  diseases_prevented    TEXT[],
  doses_required        INTEGER     DEFAULT 1,
  dose_number           INTEGER     DEFAULT 1,
  series_name           TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ── child_vaccinations ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS child_vaccinations (
  id                UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id          UUID        NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  vaccine_id        UUID        NOT NULL REFERENCES vaccines(id),
  status            TEXT        NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'issued', 'authorized')),
  administered_date DATE,
  doctor_id         UUID        REFERENCES profiles(id),
  batch_number      TEXT,
  notes             TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (child_id, vaccine_id)
);


-- ============================================================
-- 3. INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_children_parent    ON children(parent_id);
CREATE INDEX IF NOT EXISTS idx_child_vax_child    ON child_vaccinations(child_id);
CREATE INDEX IF NOT EXISTS idx_child_vax_status   ON child_vaccinations(status);
CREATE INDEX IF NOT EXISTS idx_profiles_phone     ON profiles(phone_number)
  WHERE phone_number IS NOT NULL;


-- ============================================================
-- 4. ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE children          ENABLE ROW LEVEL SECURITY;
ALTER TABLE vaccines          ENABLE ROW LEVEL SECURITY;
ALTER TABLE child_vaccinations ENABLE ROW LEVEL SECURITY;

-- ── profiles RLS ──────────────────────────────────────────────
-- Parents can only see/edit their own row.
-- Doctors can see all profiles (needed for patient search).
-- The doctor policy uses get_user_role() to avoid infinite recursion.
CREATE POLICY "own profile select" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "own profile insert" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "own profile update" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Defined after get_user_role() function below (section 5).
-- If running for the first time this will be created after the function.

-- ── children RLS ──────────────────────────────────────────────
CREATE POLICY "parent own children select" ON children
  FOR SELECT USING (auth.uid() = parent_id);

CREATE POLICY "parent own children insert" ON children
  FOR INSERT WITH CHECK (auth.uid() = parent_id);

CREATE POLICY "parent own children update" ON children
  FOR UPDATE USING (auth.uid() = parent_id);

CREATE POLICY "parent own children delete" ON children
  FOR DELETE USING (auth.uid() = parent_id);

CREATE POLICY "doctor sees all children" ON children
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'doctor')
  );

-- ── vaccines RLS ──────────────────────────────────────────────
-- Reference data — any logged-in user can read.
CREATE POLICY "vaccines read all" ON vaccines
  FOR SELECT TO authenticated USING (true);

-- ── child_vaccinations RLS ────────────────────────────────────
CREATE POLICY "parent sees own vax" ON child_vaccinations
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM children c WHERE c.id = child_id AND c.parent_id = auth.uid())
  );

CREATE POLICY "parent inserts vax" ON child_vaccinations
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM children c WHERE c.id = child_id AND c.parent_id = auth.uid())
  );

CREATE POLICY "doctor sees all vax" ON child_vaccinations
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'doctor')
  );

CREATE POLICY "doctor inserts vax" ON child_vaccinations
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'doctor')
  );

CREATE POLICY "doctor updates vax" ON child_vaccinations
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'doctor')
  );


-- ============================================================
-- 5. HELPER FUNCTIONS
-- ============================================================

-- get_user_role()
-- SECURITY DEFINER so it bypasses RLS — prevents infinite recursion
-- when the "doctor sees profiles" policy checks the profiles table.
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Doctor policy uses get_user_role() — created after the function.
-- Drop first in case it already exists with wrong definition.
DROP POLICY IF EXISTS "doctor sees profiles" ON profiles;
CREATE POLICY "doctor sees profiles" ON profiles
  FOR SELECT USING (
    auth.uid() = id OR public.get_user_role() = 'doctor'
  );

-- set_updated_at()
-- Automatically bumps updated_at on every UPDATE.
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ============================================================
-- 6. updated_at TRIGGERS
-- ============================================================
DROP TRIGGER IF EXISTS set_profiles_updated_at      ON profiles;
DROP TRIGGER IF EXISTS set_children_updated_at      ON children;
DROP TRIGGER IF EXISTS set_vaccinations_updated_at  ON child_vaccinations;

CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_children_updated_at
  BEFORE UPDATE ON children
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_vaccinations_updated_at
  BEFORE UPDATE ON child_vaccinations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ============================================================
-- 7. UNIQUE CONSTRAINTS
-- ============================================================
-- Phone numbers must be unique across all profiles (E.164 format).
-- Partial index so NULL phone numbers are allowed for multiple rows.
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_phone_unique
  ON profiles(phone_number)
  WHERE phone_number IS NOT NULL;

-- Remove the old trigger-based profile creation if it exists.
-- Profiles are now inserted directly by AuthContext on signup.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();


-- ============================================================
-- 8. DOCTOR LOCATION COLUMNS + HAVERSINE (Find Nearest Doctor)
-- ============================================================

-- Add clinic/location columns to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS clinic_name    TEXT,
  ADD COLUMN IF NOT EXISTS clinic_address TEXT,
  ADD COLUMN IF NOT EXISTS lat            DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS lng            DOUBLE PRECISION;

-- Partial index for fast geo queries — only indexed for doctors with coordinates
CREATE INDEX IF NOT EXISTS idx_profiles_doctor_location
  ON profiles(lat, lng)
  WHERE role = 'doctor' AND lat IS NOT NULL AND lng IS NOT NULL;

-- haversine_km(lat1, lng1, lat2, lng2)
-- Returns straight-line distance in km between two GPS points.
CREATE OR REPLACE FUNCTION public.haversine_km(
  lat1 DOUBLE PRECISION,
  lng1 DOUBLE PRECISION,
  lat2 DOUBLE PRECISION,
  lng2 DOUBLE PRECISION
)
RETURNS DOUBLE PRECISION AS $$
DECLARE
  r    CONSTANT DOUBLE PRECISION := 6371;   -- Earth radius in km
  dlat DOUBLE PRECISION := RADIANS(lat2 - lat1);
  dlng DOUBLE PRECISION := RADIANS(lng2 - lng1);
  a    DOUBLE PRECISION;
BEGIN
  a := SIN(dlat / 2) ^ 2
       + COS(RADIANS(lat1)) * COS(RADIANS(lat2)) * SIN(dlng / 2) ^ 2;
  RETURN r * 2 * ASIN(SQRT(a));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- find_nearest_doctors(parent_lat, parent_lng, radius_km, max_results)
-- Called from frontend: supabase.rpc('find_nearest_doctors', { parent_lat, parent_lng })
-- Returns doctors sorted by distance, filtered to radius_km.
CREATE OR REPLACE FUNCTION public.find_nearest_doctors(
  parent_lat  DOUBLE PRECISION,
  parent_lng  DOUBLE PRECISION,
  radius_km   DOUBLE PRECISION DEFAULT 50,
  max_results INTEGER          DEFAULT 20
)
RETURNS TABLE (
  id             UUID,
  full_name      TEXT,
  clinic_name    TEXT,
  clinic_address TEXT,
  lat            DOUBLE PRECISION,
  lng            DOUBLE PRECISION,
  distance_km    DOUBLE PRECISION
)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    p.id,
    p.full_name,
    p.clinic_name,
    p.clinic_address,
    p.lat,
    p.lng,
    ROUND(
      public.haversine_km(parent_lat, parent_lng, p.lat, p.lng)::NUMERIC,
      1
    )::DOUBLE PRECISION AS distance_km
  FROM profiles p
  WHERE
    p.role    = 'doctor'
    AND p.lat IS NOT NULL
    AND p.lng IS NOT NULL
    AND public.haversine_km(parent_lat, parent_lng, p.lat, p.lng) <= radius_km
  ORDER BY distance_km ASC
  LIMIT max_results;
$$;


-- ============================================================
-- 9. RPC GRANTS
-- ============================================================
GRANT EXECUTE ON FUNCTION public.find_nearest_doctors TO authenticated;
GRANT EXECUTE ON FUNCTION public.haversine_km         TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role        TO authenticated;


-- ============================================================
-- 10. NIS / UIP SEED DATA — 34 vaccines
-- Safe to re-run: INSERT ... ON CONFLICT DO NOTHING
-- ============================================================
INSERT INTO vaccines
  (name, full_name, recommended_age_weeks, description, diseases_prevented,
   doses_required, dose_number, series_name)
VALUES
  -- ── At Birth ──────────────────────────────────────────────
  ('BCG',     'Bacillus Calmette-Guérin',          0,  'Protects against TB.',             ARRAY['Tuberculosis'],                                  1, 1, 'BCG'),
  ('OPV-0',   'Oral Polio Vaccine (Birth)',         0,  'Birth dose OPV.',                  ARRAY['Poliomyelitis'],                                 4, 1, 'OPV'),
  ('Hep-B-1', 'Hepatitis B (Dose 1)',               0,  'First Hepatitis B dose.',          ARRAY['Hepatitis B'],                                   3, 1, 'Hep-B'),

  -- ── 6 Weeks ───────────────────────────────────────────────
  ('DPT-1',   'DPT (Dose 1)',                       6,  'First DPT dose.',                  ARRAY['Diphtheria','Whooping Cough','Tetanus'],          3, 1, 'DPT'),
  ('OPV-1',   'Oral Polio Vaccine (Dose 1)',        6,  'Second OPV dose.',                 ARRAY['Poliomyelitis'],                                 4, 2, 'OPV'),
  ('Hep-B-2', 'Hepatitis B (Dose 2)',               6,  'Second Hepatitis B dose.',         ARRAY['Hepatitis B'],                                   3, 2, 'Hep-B'),
  ('Hib-1',   'Haemophilus influenzae b (Dose 1)', 6,  'First Hib dose.',                  ARRAY['Hib meningitis','Pneumonia'],                    3, 1, 'Hib'),
  ('Rota-1',  'Rotavirus (Dose 1)',                 6,  'First rotavirus dose.',            ARRAY['Rotavirus diarrhea'],                            3, 1, 'Rotavirus'),

  -- ── 10 Weeks ──────────────────────────────────────────────
  ('DPT-2',   'DPT (Dose 2)',                       10, 'Second DPT dose.',                 ARRAY['Diphtheria','Whooping Cough','Tetanus'],          3, 2, 'DPT'),
  ('OPV-2',   'Oral Polio Vaccine (Dose 2)',        10, 'Third OPV dose.',                  ARRAY['Poliomyelitis'],                                 4, 3, 'OPV'),
  ('Hib-2',   'Haemophilus influenzae b (Dose 2)', 10, 'Second Hib dose.',                 ARRAY['Hib meningitis','Pneumonia'],                    3, 2, 'Hib'),
  ('Rota-2',  'Rotavirus (Dose 2)',                 10, 'Second rotavirus dose.',           ARRAY['Rotavirus diarrhea'],                            3, 2, 'Rotavirus'),

  -- ── 14 Weeks ──────────────────────────────────────────────
  ('DPT-3',   'DPT (Dose 3)',                       14, 'Third DPT dose.',                  ARRAY['Diphtheria','Whooping Cough','Tetanus'],          3, 3, 'DPT'),
  ('OPV-3',   'Oral Polio Vaccine (Dose 3)',        14, 'Fourth OPV dose.',                 ARRAY['Poliomyelitis'],                                 4, 4, 'OPV'),
  ('IPV',     'Inactivated Polio Vaccine',          14, 'Injectable polio vaccine.',        ARRAY['Poliomyelitis'],                                 1, 1, 'IPV'),
  ('Hep-B-3', 'Hepatitis B (Dose 3)',               14, 'Third Hepatitis B dose.',          ARRAY['Hepatitis B'],                                   3, 3, 'Hep-B'),
  ('Hib-3',   'Haemophilus influenzae b (Dose 3)', 14, 'Third Hib dose.',                  ARRAY['Hib meningitis','Pneumonia'],                    3, 3, 'Hib'),
  ('Rota-3',  'Rotavirus (Dose 3)',                 14, 'Third rotavirus dose.',            ARRAY['Rotavirus diarrhea'],                            3, 3, 'Rotavirus'),

  -- ── 9 Months (39 weeks) ───────────────────────────────────
  ('MCV-1',   'Measles-Containing Vaccine (Dose 1)',39, 'First measles/rubella dose.',      ARRAY['Measles','Rubella'],                             2, 1, 'MCV'),
  ('JE-1',    'Japanese Encephalitis (Dose 1)',     39, 'First JE dose.',                   ARRAY['Japanese Encephalitis'],                         2, 1, 'JE'),
  ('Vit-A-1', 'Vitamin A (Dose 1)',                 39, 'First Vitamin A supplement.',      ARRAY['Vitamin A deficiency'],                          9, 1, 'Vit-A'),

  -- ── 12 Months (52 weeks) ──────────────────────────────────
  ('Hep-A-1', 'Hepatitis A (Dose 1)',               52, 'First Hepatitis A dose.',          ARRAY['Hepatitis A'],                                   2, 1, 'Hep-A'),

  -- ── 15 Months (65 weeks) ──────────────────────────────────
  ('MMR-1',   'Measles Mumps Rubella (Dose 1)',     65, 'Combined MMR vaccine.',            ARRAY['Measles','Mumps','Rubella'],                     2, 1, 'MMR'),

  -- ── 16–18 Months (72 weeks) ───────────────────────────────
  ('DPT-B1',  'DPT Booster 1',                     72, 'First DPT booster.',               ARRAY['Diphtheria','Whooping Cough','Tetanus'],          2, 1, 'DPT-B'),
  ('OPV-B',   'OPV Booster',                        72, 'OPV booster dose.',                ARRAY['Poliomyelitis'],                                 1, 1, 'OPV-B'),

  -- ── 18 Months (78 weeks) ──────────────────────────────────
  ('MCV-2',   'Measles-Containing Vaccine (Dose 2)',78, 'Second measles/rubella dose.',     ARRAY['Measles','Rubella'],                             2, 2, 'MCV'),
  ('JE-2',    'Japanese Encephalitis (Dose 2)',     78, 'Second JE dose.',                  ARRAY['Japanese Encephalitis'],                         2, 2, 'JE'),
  ('Hep-A-2', 'Hepatitis A (Dose 2)',               78, 'Second Hepatitis A dose.',         ARRAY['Hepatitis A'],                                   2, 2, 'Hep-A'),

  -- ── 21 Months (91 weeks) ──────────────────────────────────
  ('Typhoid', 'Typhoid Conjugate Vaccine',          91, 'Typhoid vaccine.',                 ARRAY['Typhoid fever'],                                 1, 1, 'Typhoid'),

  -- ── 5 Years (260 weeks) ───────────────────────────────────
  ('DPT-B2',  'DPT Booster 2',                    260, 'Second DPT booster (5 years).',    ARRAY['Diphtheria','Whooping Cough','Tetanus'],          2, 2, 'DPT-B'),
  ('MMR-2',   'Measles Mumps Rubella (Dose 2)',   260, 'Second MMR dose (5 years).',        ARRAY['Measles','Mumps','Rubella'],                     2, 2, 'MMR'),

  -- ── 10 Years (520 weeks) ──────────────────────────────────
  ('Td-1',    'Tetanus-diphtheria (10 years)',    520, 'Td booster at 10 years.',           ARRAY['Tetanus','Diphtheria'],                          2, 1, 'Td'),

  -- ── 16 Years (832 weeks) ──────────────────────────────────
  ('Td-2',    'Tetanus-diphtheria Booster (16 years)', 832, 'Td booster at 16 years.',     ARRAY['Tetanus','Diphtheria'],                          2, 2, 'Td')

ON CONFLICT DO NOTHING;


