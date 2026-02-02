-- Migration 001: Core tables (profiles, support_links)
-- Emily Mission Log

-- =============================================================================
-- PROFILES TABLE
-- Extends Supabase auth.users with app-specific data
-- =============================================================================

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  role_global TEXT NOT NULL CHECK (role_global IN ('emily', 'support', 'joey')),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for role lookups
CREATE INDEX idx_profiles_role ON profiles(role_global);

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- SUPPORT LINKS TABLE
-- Links support accounts to Emily (max 3 active per Emily)
-- =============================================================================

CREATE TABLE support_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  emily_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  support_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(emily_user_id, support_user_id)
);

-- Index for lookups
CREATE INDEX idx_support_links_emily ON support_links(emily_user_id) WHERE active = true;
CREATE INDEX idx_support_links_support ON support_links(support_user_id) WHERE active = true;

-- Constraint: max 3 active supports per Emily
CREATE OR REPLACE FUNCTION check_max_supports()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.active = true AND (
    SELECT COUNT(*) FROM support_links
    WHERE emily_user_id = NEW.emily_user_id
    AND active = true
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
  ) >= 3 THEN
    RAISE EXCEPTION 'Maximum 3 active support links allowed per Emily';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_max_supports
  BEFORE INSERT OR UPDATE ON support_links
  FOR EACH ROW
  EXECUTE FUNCTION check_max_supports();

-- =============================================================================
-- HELPER FUNCTIONS FOR RLS (in public schema)
-- =============================================================================

-- Get current user's role
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
  SELECT role_global FROM profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Check if current user is Joey
CREATE OR REPLACE FUNCTION public.is_joey()
RETURNS BOOLEAN AS $$
  SELECT COALESCE(public.get_user_role() = 'joey', false)
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Check if current user is Emily
CREATE OR REPLACE FUNCTION public.is_emily()
RETURNS BOOLEAN AS $$
  SELECT COALESCE(public.get_user_role() = 'emily', false)
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Check if current user is a support of given Emily
CREATE OR REPLACE FUNCTION public.is_support_of(emily_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM support_links
    WHERE emily_user_id = emily_id
    AND support_user_id = auth.uid()
    AND active = true
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Get the Emily user ID that current support user is linked to
CREATE OR REPLACE FUNCTION public.get_emily_id()
RETURNS UUID AS $$
  SELECT emily_user_id FROM support_links
  WHERE support_user_id = auth.uid()
  AND active = true
  LIMIT 1
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- =============================================================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- =============================================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, role_global)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'support')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_links ENABLE ROW LEVEL SECURITY;

-- Profiles: Everyone can read active profiles, users can update own
CREATE POLICY "profiles_select" ON profiles
  FOR SELECT USING (active = true);

CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (id = auth.uid());

CREATE POLICY "joey_full_profiles" ON profiles
  FOR ALL USING (public.is_joey());

-- Support links: Joey full access, Emily can view own, Support can view own
CREATE POLICY "joey_full_support_links" ON support_links
  FOR ALL USING (public.is_joey());

CREATE POLICY "emily_view_own_support_links" ON support_links
  FOR SELECT USING (emily_user_id = auth.uid());

CREATE POLICY "support_view_own_links" ON support_links
  FOR SELECT USING (support_user_id = auth.uid());
