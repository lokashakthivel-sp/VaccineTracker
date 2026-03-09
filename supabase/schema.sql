-- ============================================================
-- VACCINETRACK — SUPABASE SCHEMA  (run once in SQL Editor)
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- PROFILES
CREATE TABLE profiles (
  id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role         TEXT NOT NULL CHECK (role IN ('parent','doctor')),
  full_name    TEXT NOT NULL,
  phone_number TEXT CHECK (phone_number ~ '^\+[1-9]\d{6,14}$'),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile select"    ON profiles FOR SELECT  USING (auth.uid() = id);
CREATE POLICY "own profile insert"    ON profiles FOR INSERT  WITH CHECK (auth.uid() = id);
CREATE POLICY "own profile update"    ON profiles FOR UPDATE  USING (auth.uid() = id);
CREATE POLICY "doctor sees profiles"  ON profiles FOR SELECT  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role='doctor'));

-- CHILDREN
CREATE TABLE children (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  full_name   TEXT NOT NULL,
  dob         DATE NOT NULL,
  gender      TEXT NOT NULL CHECK (gender IN ('male','female','other')),
  blood_group TEXT CHECK (blood_group IN ('A+','A-','B+','B-','AB+','AB-','O+','O-','unknown')),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE children ENABLE ROW LEVEL SECURITY;
CREATE POLICY "parent own children select" ON children FOR SELECT  USING (auth.uid() = parent_id);
CREATE POLICY "parent own children insert" ON children FOR INSERT  WITH CHECK (auth.uid() = parent_id);
CREATE POLICY "parent own children update" ON children FOR UPDATE  USING (auth.uid() = parent_id);
CREATE POLICY "parent own children delete" ON children FOR DELETE  USING (auth.uid() = parent_id);
CREATE POLICY "doctor sees all children"   ON children FOR SELECT  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role='doctor'));

-- VACCINES (reference data)
CREATE TABLE vaccines (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                  TEXT NOT NULL,
  full_name             TEXT NOT NULL,
  recommended_age_weeks INTEGER NOT NULL,
  description           TEXT,
  diseases_prevented    TEXT[],
  doses_required        INTEGER DEFAULT 1,
  dose_number           INTEGER DEFAULT 1,
  series_name           TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE vaccines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vaccines read all" ON vaccines FOR SELECT TO authenticated USING (true);

-- CHILD_VACCINATIONS
CREATE TABLE child_vaccinations (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id          UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  vaccine_id        UUID NOT NULL REFERENCES vaccines(id),
  status            TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','issued','authorized')),
  administered_date DATE,
  doctor_id         UUID REFERENCES profiles(id),
  batch_number      TEXT,
  notes             TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (child_id, vaccine_id)
);
ALTER TABLE child_vaccinations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "parent sees own vax"   ON child_vaccinations FOR SELECT  USING (EXISTS (SELECT 1 FROM children c WHERE c.id=child_id AND c.parent_id=auth.uid()));
CREATE POLICY "parent inserts vax"    ON child_vaccinations FOR INSERT  WITH CHECK (EXISTS (SELECT 1 FROM children c WHERE c.id=child_id AND c.parent_id=auth.uid()));
CREATE POLICY "doctor sees all vax"   ON child_vaccinations FOR SELECT  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id=auth.uid() AND p.role='doctor'));
CREATE POLICY "doctor inserts vax"    ON child_vaccinations FOR INSERT  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id=auth.uid() AND p.role='doctor'));
CREATE POLICY "doctor updates vax"    ON child_vaccinations FOR UPDATE  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id=auth.uid() AND p.role='doctor'));

-- INDEXES
CREATE INDEX idx_children_parent        ON children(parent_id);
CREATE INDEX idx_child_vax_child        ON child_vaccinations(child_id);
CREATE INDEX idx_child_vax_status       ON child_vaccinations(status);
CREATE INDEX idx_profiles_phone         ON profiles(phone_number) WHERE phone_number IS NOT NULL;

-- ── NIS / UIP SEED DATA ──────────────────────────────────────
INSERT INTO vaccines (name,full_name,recommended_age_weeks,description,diseases_prevented,doses_required,dose_number,series_name) VALUES
('BCG','Bacillus Calmette-Guérin',0,'Protects against TB.',ARRAY['Tuberculosis'],1,1,'BCG'),
('OPV-0','Oral Polio Vaccine (Birth)',0,'Birth dose OPV.',ARRAY['Poliomyelitis'],4,1,'OPV'),
('Hep-B-1','Hepatitis B (Dose 1)',0,'First Hepatitis B dose.',ARRAY['Hepatitis B'],3,1,'Hep-B'),
('DPT-1','DPT (Dose 1)',6,'First DPT dose.',ARRAY['Diphtheria','Whooping Cough','Tetanus'],3,1,'DPT'),
('OPV-1','Oral Polio Vaccine (Dose 1)',6,'Second OPV dose.',ARRAY['Poliomyelitis'],4,2,'OPV'),
('Hep-B-2','Hepatitis B (Dose 2)',6,'Second Hepatitis B dose.',ARRAY['Hepatitis B'],3,2,'Hep-B'),
('Hib-1','Haemophilus influenzae b (Dose 1)',6,'First Hib dose.',ARRAY['Hib meningitis','Pneumonia'],3,1,'Hib'),
('Rota-1','Rotavirus (Dose 1)',6,'First rotavirus dose.',ARRAY['Rotavirus diarrhea'],3,1,'Rotavirus'),
('DPT-2','DPT (Dose 2)',10,'Second DPT dose.',ARRAY['Diphtheria','Whooping Cough','Tetanus'],3,2,'DPT'),
('OPV-2','Oral Polio Vaccine (Dose 2)',10,'Third OPV dose.',ARRAY['Poliomyelitis'],4,3,'OPV'),
('Hib-2','Haemophilus influenzae b (Dose 2)',10,'Second Hib dose.',ARRAY['Hib meningitis','Pneumonia'],3,2,'Hib'),
('Rota-2','Rotavirus (Dose 2)',10,'Second rotavirus dose.',ARRAY['Rotavirus diarrhea'],3,2,'Rotavirus'),
('DPT-3','DPT (Dose 3)',14,'Third DPT dose.',ARRAY['Diphtheria','Whooping Cough','Tetanus'],3,3,'DPT'),
('OPV-3','Oral Polio Vaccine (Dose 3)',14,'Fourth OPV dose.',ARRAY['Poliomyelitis'],4,4,'OPV'),
('IPV','Inactivated Polio Vaccine',14,'Injectable polio vaccine.',ARRAY['Poliomyelitis'],1,1,'IPV'),
('Hep-B-3','Hepatitis B (Dose 3)',14,'Third Hepatitis B dose.',ARRAY['Hepatitis B'],3,3,'Hep-B'),
('Hib-3','Haemophilus influenzae b (Dose 3)',14,'Third Hib dose.',ARRAY['Hib meningitis','Pneumonia'],3,3,'Hib'),
('Rota-3','Rotavirus (Dose 3)',14,'Third rotavirus dose.',ARRAY['Rotavirus diarrhea'],3,3,'Rotavirus'),
('MCV-1','Measles-Containing Vaccine (Dose 1)',39,'First measles/rubella dose.',ARRAY['Measles','Rubella'],2,1,'MCV'),
('JE-1','Japanese Encephalitis (Dose 1)',39,'First JE dose.',ARRAY['Japanese Encephalitis'],2,1,'JE'),
('Vit-A-1','Vitamin A (Dose 1)',39,'First Vitamin A supplement.',ARRAY['Vitamin A deficiency'],9,1,'Vit-A'),
('Hep-A-1','Hepatitis A (Dose 1)',52,'First Hepatitis A dose.',ARRAY['Hepatitis A'],2,1,'Hep-A'),
('MMR-1','Measles Mumps Rubella (Dose 1)',65,'Combined MMR vaccine.',ARRAY['Measles','Mumps','Rubella'],2,1,'MMR'),
('DPT-B1','DPT Booster 1',72,'First DPT booster.',ARRAY['Diphtheria','Whooping Cough','Tetanus'],2,1,'DPT-B'),
('OPV-B','OPV Booster',72,'OPV booster dose.',ARRAY['Poliomyelitis'],1,1,'OPV-B'),
('MCV-2','Measles-Containing Vaccine (Dose 2)',78,'Second measles/rubella dose.',ARRAY['Measles','Rubella'],2,2,'MCV'),
('JE-2','Japanese Encephalitis (Dose 2)',78,'Second JE dose.',ARRAY['Japanese Encephalitis'],2,2,'JE'),
('Hep-A-2','Hepatitis A (Dose 2)',78,'Second Hepatitis A dose.',ARRAY['Hepatitis A'],2,2,'Hep-A'),
('Typhoid','Typhoid Conjugate Vaccine',91,'Typhoid vaccine.',ARRAY['Typhoid fever'],1,1,'Typhoid'),
('DPT-B2','DPT Booster 2',260,'Second DPT booster (5 years).',ARRAY['Diphtheria','Whooping Cough','Tetanus'],2,2,'DPT-B'),
('MMR-2','Measles Mumps Rubella (Dose 2)',260,'Second MMR dose (5 years).',ARRAY['Measles','Mumps','Rubella'],2,2,'MMR'),
('Td-1','Tetanus-diphtheria (10 years)',520,'Td booster at 10 years.',ARRAY['Tetanus','Diphtheria'],2,1,'Td'),
('Td-2','Tetanus-diphtheria Booster (16 years)',832,'Td booster at 16 years.',ARRAY['Tetanus','Diphtheria'],2,2,'Td');

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, role, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'role', 'parent'),
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Unknown')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();