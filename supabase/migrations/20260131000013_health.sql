-- Migration 013: Health Log
-- Emily Mission Log

-- =============================================================================
-- HEALTH ACCESS LEVEL ENUM
-- =============================================================================

CREATE TYPE health_access_level AS ENUM ('none', 'view', 'edit');

-- =============================================================================
-- PROVIDER TYPE ENUM
-- =============================================================================

CREATE TYPE provider_type AS ENUM ('doctor', 'therapist', 'group', 'other');

-- =============================================================================
-- HEALTH ACCESS CONFIG TABLE
-- Controls who can access health data (per Emily owner)
-- =============================================================================

CREATE TABLE health_access_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID UNIQUE NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Support access level
  support_access health_access_level NOT NULL DEFAULT 'view',

  -- Emily permissions
  emily_can_log_intake BOOLEAN NOT NULL DEFAULT true,
  emily_can_view_intake_history BOOLEAN NOT NULL DEFAULT false,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trigger for updated_at
CREATE TRIGGER health_access_config_updated_at
  BEFORE UPDATE ON health_access_config
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- HEALTH PHARMACIES TABLE
-- =============================================================================

CREATE TABLE health_pharmacies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Pharmacy info
  name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  notes_md TEXT,

  -- State
  active BOOLEAN NOT NULL DEFAULT true,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index
CREATE INDEX idx_health_pharmacies_owner ON health_pharmacies(owner_user_id) WHERE active = true;

-- =============================================================================
-- HEALTH PROVIDERS TABLE
-- Doctors, therapists, groups, etc.
-- =============================================================================

CREATE TABLE health_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Provider info
  provider_type provider_type NOT NULL,
  name TEXT NOT NULL,
  specialty_or_role TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  portal_url TEXT,
  notes_md TEXT,

  -- State
  active BOOLEAN NOT NULL DEFAULT true,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index
CREATE INDEX idx_health_providers_owner ON health_providers(owner_user_id) WHERE active = true;
CREATE INDEX idx_health_providers_type ON health_providers(owner_user_id, provider_type) WHERE active = true;

-- =============================================================================
-- HEALTH MEDICATIONS TABLE
-- =============================================================================

CREATE TABLE health_medications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Medication info
  name TEXT NOT NULL,
  instructions_md TEXT, -- Dosage instructions

  -- Inventory tracking
  pills_on_hand INTEGER,
  low_supply_threshold INTEGER, -- Alert when pills_on_hand <= this
  rx_numbers TEXT[], -- Can have multiple Rx numbers
  refills_remaining INTEGER,

  -- Dates
  last_refill_date DATE,
  next_refill_due_date DATE,

  -- References
  pharmacy_id UUID REFERENCES health_pharmacies(id) ON DELETE SET NULL,
  prescriber_provider_id UUID REFERENCES health_providers(id) ON DELETE SET NULL,

  -- Notes
  notes_md TEXT,

  -- State
  active BOOLEAN NOT NULL DEFAULT true,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index
CREATE INDEX idx_health_medications_owner ON health_medications(owner_user_id) WHERE active = true;

-- Trigger for updated_at
CREATE TRIGGER health_medications_updated_at
  BEFORE UPDATE ON health_medications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- HEALTH MEDICATION INTAKE LOGS TABLE
-- Optional dose logging
-- =============================================================================

CREATE TABLE health_med_intake_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  medication_id UUID NOT NULL REFERENCES health_medications(id) ON DELETE CASCADE,

  -- Intake info
  taken_at TIMESTAMPTZ NOT NULL,
  dose_text TEXT, -- e.g., "1 pill", "10mg"
  note TEXT,

  -- Who logged it
  created_by_user_id UUID NOT NULL REFERENCES profiles(id),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index
CREATE INDEX idx_health_intake_medication ON health_med_intake_logs(medication_id, taken_at DESC);
CREATE INDEX idx_health_intake_owner_date ON health_med_intake_logs(owner_user_id, taken_at DESC);

-- =============================================================================
-- HEALTH REFILL LOGS TABLE
-- Track refill history
-- =============================================================================

CREATE TABLE health_refill_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  medication_id UUID NOT NULL REFERENCES health_medications(id) ON DELETE CASCADE,

  -- Refill info
  refill_date DATE NOT NULL,
  pills_added INTEGER,
  refills_remaining_after INTEGER,
  rx_number_used TEXT,
  note TEXT,

  -- Who logged it
  created_by_user_id UUID NOT NULL REFERENCES profiles(id),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index
CREATE INDEX idx_health_refill_medication ON health_refill_logs(medication_id, refill_date DESC);

-- =============================================================================
-- HELPER FUNCTION FOR HEALTH ACCESS
-- =============================================================================

CREATE OR REPLACE FUNCTION public.can_access_health(owner_id UUID, access_type TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  config RECORD;
  user_role TEXT;
BEGIN
  user_role := public.get_user_role();

  -- Joey always has access
  IF user_role = 'joey' THEN
    RETURN TRUE;
  END IF;

  -- Emily can view own health data
  IF user_role = 'emily' AND owner_id = auth.uid() THEN
    IF access_type = 'view' THEN
      RETURN TRUE;
    END IF;
    -- Check if Emily can log intake
    IF access_type = 'log_intake' THEN
      SELECT * INTO config FROM health_access_config WHERE owner_user_id = owner_id;
      RETURN COALESCE(config.emily_can_log_intake, true);
    END IF;
    -- Check if Emily can view intake history
    IF access_type = 'view_intake_history' THEN
      SELECT * INTO config FROM health_access_config WHERE owner_user_id = owner_id;
      RETURN COALESCE(config.emily_can_view_intake_history, false);
    END IF;
  END IF;

  -- Support: check config
  IF user_role = 'support' AND public.is_support_of(owner_id) THEN
    SELECT * INTO config FROM health_access_config WHERE owner_user_id = owner_id;
    IF config IS NULL THEN
      -- Default to view access
      RETURN access_type = 'view';
    END IF;
    IF config.support_access = 'edit' THEN
      RETURN TRUE;
    ELSIF config.support_access = 'view' AND access_type IN ('view', 'view_intake_history') THEN
      RETURN TRUE;
    END IF;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE health_access_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_pharmacies ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_med_intake_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_refill_logs ENABLE ROW LEVEL SECURITY;

-- Health access config
CREATE POLICY "joey_full_health_config" ON health_access_config
  FOR ALL USING (public.is_joey());

CREATE POLICY "emily_read_own_health_config" ON health_access_config
  FOR SELECT USING (owner_user_id = auth.uid());

-- Health pharmacies
CREATE POLICY "joey_full_pharmacies" ON health_pharmacies
  FOR ALL USING (public.is_joey());

CREATE POLICY "view_health_pharmacies" ON health_pharmacies
  FOR SELECT USING (public.can_access_health(owner_user_id, 'view'));

CREATE POLICY "edit_health_pharmacies" ON health_pharmacies
  FOR ALL USING (public.can_access_health(owner_user_id, 'edit'));

-- Health providers
CREATE POLICY "joey_full_providers" ON health_providers
  FOR ALL USING (public.is_joey());

CREATE POLICY "view_health_providers" ON health_providers
  FOR SELECT USING (public.can_access_health(owner_user_id, 'view'));

CREATE POLICY "edit_health_providers" ON health_providers
  FOR ALL USING (public.can_access_health(owner_user_id, 'edit'));

-- Health medications
CREATE POLICY "joey_full_medications" ON health_medications
  FOR ALL USING (public.is_joey());

CREATE POLICY "view_health_medications" ON health_medications
  FOR SELECT USING (public.can_access_health(owner_user_id, 'view'));

CREATE POLICY "edit_health_medications" ON health_medications
  FOR ALL USING (public.can_access_health(owner_user_id, 'edit'));

-- Health intake logs
CREATE POLICY "joey_full_intake_logs" ON health_med_intake_logs
  FOR ALL USING (public.is_joey());

CREATE POLICY "emily_insert_intake" ON health_med_intake_logs
  FOR INSERT WITH CHECK (
    public.is_emily() AND
    owner_user_id = auth.uid() AND
    public.can_access_health(owner_user_id, 'log_intake')
  );

CREATE POLICY "emily_view_today_intake" ON health_med_intake_logs
  FOR SELECT USING (
    public.is_emily() AND
    owner_user_id = auth.uid() AND
    taken_at::date = CURRENT_DATE
  );

CREATE POLICY "joey_view_all_intake" ON health_med_intake_logs
  FOR SELECT USING (public.is_joey());

-- Health refill logs
CREATE POLICY "joey_full_refill_logs" ON health_refill_logs
  FOR ALL USING (public.is_joey());

CREATE POLICY "view_health_refill_logs" ON health_refill_logs
  FOR SELECT USING (public.can_access_health(owner_user_id, 'view'));

CREATE POLICY "edit_health_refill_logs" ON health_refill_logs
  FOR ALL USING (public.can_access_health(owner_user_id, 'edit'));

-- =============================================================================
-- AUTO-CREATE HEALTH ACCESS CONFIG FOR EMILY USERS
-- =============================================================================

CREATE OR REPLACE FUNCTION create_health_config_for_emily()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role_global = 'emily' THEN
    INSERT INTO health_access_config (owner_user_id)
    VALUES (NEW.id)
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_emily_profile_created
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_health_config_for_emily();
