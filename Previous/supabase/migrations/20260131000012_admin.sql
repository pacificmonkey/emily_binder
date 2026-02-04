-- Migration 012: Admin (Joey Todos & Mission Proposals)
-- Emily Mission Log

-- =============================================================================
-- JOEY TODO TYPE ENUM
-- =============================================================================

CREATE TYPE joey_todo_type AS ENUM (
  'deadline_risk',       -- Mission deadline approaching
  'urgent_report',       -- Emily reported something urgent
  'health_refill_risk',  -- Medication needs refill
  'proposal_pending'     -- Support proposal needs review
);

CREATE TYPE joey_todo_status AS ENUM ('open', 'done');

-- =============================================================================
-- JOEY TODOS TABLE
-- In-app inbox/alerts for Joey
-- =============================================================================

CREATE TABLE joey_todos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Todo info
  type joey_todo_type NOT NULL,
  title TEXT NOT NULL,
  description TEXT,

  -- Related entity (mission, medication, proposal, etc.)
  related_id UUID,
  related_type TEXT, -- 'mission', 'medication', 'proposal', etc.

  -- Status
  status joey_todo_status NOT NULL DEFAULT 'open',

  -- For Emily reference
  for_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

-- Index for open todos
CREATE INDEX idx_joey_todos_open ON joey_todos(status, created_at DESC) WHERE status = 'open';
CREATE INDEX idx_joey_todos_type ON joey_todos(type, status);

-- Unique constraint: only one open todo per type+related_id
CREATE UNIQUE INDEX idx_joey_todos_unique_open
  ON joey_todos(type, related_id)
  WHERE status = 'open' AND related_id IS NOT NULL;

-- =============================================================================
-- MISSION PROPOSAL STATUS ENUM
-- =============================================================================

CREATE TYPE proposal_status AS ENUM ('pending', 'approved', 'rejected');

-- =============================================================================
-- MISSION PROPOSALS TABLE
-- Support users propose recurring missions for Joey approval
-- =============================================================================

CREATE TABLE mission_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Who proposed and for whom
  proposed_by_user_id UUID NOT NULL REFERENCES profiles(id),
  target_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Mission details
  title TEXT NOT NULL,
  instructions_md TEXT,
  category_id UUID NOT NULL REFERENCES categories(id),

  -- Recurrence settings
  recurrence_pattern recurrence_pattern NOT NULL,
  weekdays INTEGER[], -- For specific_weekdays

  -- Urgency flag (urgent = auto-approve)
  is_urgent BOOLEAN NOT NULL DEFAULT false,

  -- Review status
  status proposal_status NOT NULL DEFAULT 'pending',
  reviewed_by_user_id UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  review_note TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for pending proposals
CREATE INDEX idx_proposals_pending ON mission_proposals(status, created_at DESC)
  WHERE status = 'pending';
CREATE INDEX idx_proposals_target ON mission_proposals(target_user_id, status);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE joey_todos ENABLE ROW LEVEL SECURITY;
ALTER TABLE mission_proposals ENABLE ROW LEVEL SECURITY;

-- Joey todos: only Joey can access
CREATE POLICY "joey_full_todos" ON joey_todos
  FOR ALL USING (public.is_joey());

-- Mission proposals
CREATE POLICY "joey_full_proposals" ON mission_proposals
  FOR ALL USING (public.is_joey());

-- Support can read and create proposals
CREATE POLICY "support_read_own_proposals" ON mission_proposals
  FOR SELECT USING (
    public.get_user_role() = 'support' AND
    proposed_by_user_id = auth.uid()
  );

CREATE POLICY "support_create_proposals" ON mission_proposals
  FOR INSERT WITH CHECK (
    public.get_user_role() = 'support' AND
    proposed_by_user_id = auth.uid() AND
    public.is_support_of(target_user_id)
  );

-- Emily can read proposals targeting them
CREATE POLICY "emily_read_own_proposals" ON mission_proposals
  FOR SELECT USING (
    public.is_emily() AND target_user_id = auth.uid()
  );

-- =============================================================================
-- AUTO-CREATE JOEY TODO FOR PENDING PROPOSALS
-- =============================================================================

CREATE OR REPLACE FUNCTION create_todo_for_proposal()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create todo for non-urgent proposals (urgent auto-approve)
  IF NEW.status = 'pending' AND NOT NEW.is_urgent THEN
    INSERT INTO joey_todos (type, title, description, related_id, related_type, for_user_id)
    VALUES (
      'proposal_pending',
      'Review proposal: ' || NEW.title,
      'Support has proposed a new recurring mission',
      NEW.id,
      'proposal',
      NEW.target_user_id
    )
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_proposal_created
  AFTER INSERT ON mission_proposals
  FOR EACH ROW
  EXECUTE FUNCTION create_todo_for_proposal();

-- =============================================================================
-- RESOLVE TODO WHEN PROPOSAL IS REVIEWED
-- =============================================================================

CREATE OR REPLACE FUNCTION resolve_proposal_todo()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status != 'pending' AND OLD.status = 'pending' THEN
    UPDATE joey_todos
    SET status = 'done', resolved_at = now()
    WHERE related_id = NEW.id AND related_type = 'proposal' AND status = 'open';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_proposal_reviewed
  AFTER UPDATE ON mission_proposals
  FOR EACH ROW
  EXECUTE FUNCTION resolve_proposal_todo();
