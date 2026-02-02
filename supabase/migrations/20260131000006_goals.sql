-- Migration 006: Goals (Destinies & Quests)
-- Emily Mission Log

-- =============================================================================
-- GOAL TYPE ENUM
-- =============================================================================

CREATE TYPE goal_type AS ENUM ('destiny', 'quest');

-- =============================================================================
-- GOALS TABLE
-- Destinies (Emily-created) and Quests (Support-created)
-- =============================================================================

CREATE TABLE goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_by_user_id UUID NOT NULL REFERENCES profiles(id),

  -- Goal info
  title TEXT NOT NULL,
  description_md TEXT,
  goal_type goal_type NOT NULL,

  -- State
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  archived BOOLEAN NOT NULL DEFAULT false,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_goals_owner ON goals(owner_user_id) WHERE archived = false;
CREATE INDEX idx_goals_type ON goals(owner_user_id, goal_type) WHERE archived = false;

-- Trigger for updated_at
CREATE TRIGGER goals_updated_at
  BEFORE UPDATE ON goals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- GOAL ITEMS TABLE
-- Ordered list of missions and attachments linked to a goal
-- =============================================================================

CREATE TABLE goal_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,

  -- Either a mission or an attachment
  mission_id UUID REFERENCES missions(id) ON DELETE SET NULL,
  attachment_url TEXT,
  attachment_name TEXT,

  -- Ordering
  sort_order INTEGER NOT NULL DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Constraint: must have either mission or attachment
  CONSTRAINT has_content CHECK (
    mission_id IS NOT NULL OR attachment_url IS NOT NULL
  )
);

-- Indexes
CREATE INDEX idx_goal_items_goal ON goal_items(goal_id, sort_order);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_items ENABLE ROW LEVEL SECURITY;

-- Goals: Joey full access
CREATE POLICY "joey_full_goals" ON goals
  FOR ALL USING (public.is_joey());

-- Emily: full access to own goals
CREATE POLICY "emily_own_goals" ON goals
  FOR ALL USING (
    public.is_emily() AND owner_user_id = auth.uid()
  );

-- Emily: can only create Destinies, not Quests
CREATE POLICY "emily_create_destiny" ON goals
  FOR INSERT WITH CHECK (
    public.is_emily() AND
    owner_user_id = auth.uid() AND
    goal_type = 'destiny'
  );

-- Support: read goals for their Emily
CREATE POLICY "support_read_goals" ON goals
  FOR SELECT USING (
    public.get_user_role() = 'support' AND
    public.is_support_of(owner_user_id)
  );

-- Support: create Quests for their Emily
CREATE POLICY "support_create_quest" ON goals
  FOR INSERT WITH CHECK (
    public.get_user_role() = 'support' AND
    public.is_support_of(owner_user_id) AND
    goal_type = 'quest'
  );

-- Goal items: inherit from parent goal
CREATE POLICY "joey_full_goal_items" ON goal_items
  FOR ALL USING (public.is_joey());

CREATE POLICY "emily_own_goal_items" ON goal_items
  FOR ALL USING (
    public.is_emily() AND
    EXISTS (
      SELECT 1 FROM goals
      WHERE goals.id = goal_items.goal_id
      AND goals.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "support_read_goal_items" ON goal_items
  FOR SELECT USING (
    public.get_user_role() = 'support' AND
    EXISTS (
      SELECT 1 FROM goals
      WHERE goals.id = goal_items.goal_id
      AND public.is_support_of(goals.owner_user_id)
    )
  );

CREATE POLICY "support_manage_quest_items" ON goal_items
  FOR ALL USING (
    public.get_user_role() = 'support' AND
    EXISTS (
      SELECT 1 FROM goals
      WHERE goals.id = goal_items.goal_id
      AND goals.created_by_user_id = auth.uid()
      AND goals.goal_type = 'quest'
    )
  );
