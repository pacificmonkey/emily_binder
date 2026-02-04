-- Migration: 00004_feature_modules.sql
-- Description: Feature toggle tables: FeatureModule, FeatureModuleSetting
-- Schema Version: 1.3.0

-- FeatureModule: Canonical list of major modules, with dependencies for safe toggling
CREATE TABLE feature_module (
  feature_module_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key feature_module_key NOT NULL UNIQUE,
  default_enabled BOOLEAN NOT NULL DEFAULT false,
  depends_on_module_keys TEXT[], -- Array of feature_module_key values
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for feature module lookups
CREATE INDEX idx_feature_module_key ON feature_module(key);

-- FeatureModuleSetting: Admin-controlled enable/disable for each module for a given workspace+patient
CREATE TABLE feature_module_setting (
  feature_module_setting_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspace(workspace_id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patient_profile(patient_id) ON DELETE CASCADE,
  feature_module_id UUID NOT NULL REFERENCES feature_module(feature_module_id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL,
  set_by_user_id UUID NOT NULL REFERENCES "user"(user_id) ON DELETE SET NULL,
  set_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT,

  -- Unique constraint: one setting per patient per module
  CONSTRAINT uq_feature_module_setting_patient_module UNIQUE (patient_id, feature_module_id)
);

-- Indexes for feature module setting
CREATE INDEX idx_feature_module_setting_workspace_id ON feature_module_setting(workspace_id);
CREATE INDEX idx_feature_module_setting_patient_id ON feature_module_setting(patient_id);
CREATE INDEX idx_feature_module_setting_enabled ON feature_module_setting(enabled);

-- Comments for documentation
COMMENT ON TABLE feature_module IS 'Canonical list of major modules, with dependencies for safe toggling.';
COMMENT ON TABLE feature_module_setting IS 'Admin-controlled enable/disable for each module for a given workspace+patient.';

-- Function to check if a feature module is enabled for a patient
CREATE OR REPLACE FUNCTION is_feature_enabled(
  p_patient_id UUID,
  p_feature_key feature_module_key
) RETURNS BOOLEAN AS $$
DECLARE
  v_feature_module_id UUID;
  v_setting_enabled BOOLEAN;
  v_default_enabled BOOLEAN;
BEGIN
  -- Get the feature module
  SELECT feature_module_id, default_enabled
  INTO v_feature_module_id, v_default_enabled
  FROM feature_module
  WHERE key = p_feature_key;

  IF v_feature_module_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Check for patient-specific setting
  SELECT enabled INTO v_setting_enabled
  FROM feature_module_setting
  WHERE patient_id = p_patient_id
    AND feature_module_id = v_feature_module_id;

  -- Return setting if exists, otherwise default
  RETURN COALESCE(v_setting_enabled, v_default_enabled);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check feature dependencies before enabling
CREATE OR REPLACE FUNCTION check_feature_dependencies(
  p_patient_id UUID,
  p_feature_key feature_module_key
) RETURNS BOOLEAN AS $$
DECLARE
  v_depends_on TEXT[];
  v_dep_key TEXT;
BEGIN
  -- Get dependencies for this feature
  SELECT depends_on_module_keys INTO v_depends_on
  FROM feature_module
  WHERE key = p_feature_key;

  IF v_depends_on IS NULL OR array_length(v_depends_on, 1) IS NULL THEN
    RETURN TRUE;
  END IF;

  -- Check each dependency
  FOREACH v_dep_key IN ARRAY v_depends_on LOOP
    IF NOT is_feature_enabled(p_patient_id, v_dep_key::feature_module_key) THEN
      RETURN FALSE;
    END IF;
  END LOOP;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
