-- Migration 007: Add category to events for VP values
-- Emily Mission Log

-- =============================================================================
-- ADD CATEGORY_ID TO EVENTS
-- =============================================================================

-- Add category_id column (nullable initially, links to same categories as missions)
ALTER TABLE events
ADD COLUMN category_id UUID REFERENCES categories(id) ON DELETE SET NULL;

-- Create index for category lookup (if not exists)
CREATE INDEX IF NOT EXISTS idx_events_category ON events(category_id) WHERE archived = false;

-- =============================================================================
-- SET DEFAULT CATEGORY FOR EXISTING EVENTS
-- =============================================================================

-- Set existing events to a sensible default based on their event_category type
-- medication -> Health, appointment -> Health, refill -> Health, general -> Self-Care
UPDATE events
SET category_id = (
  CASE
    WHEN category IN ('medication', 'appointment', 'refill') THEN
      (SELECT id FROM categories WHERE name = 'Health' LIMIT 1)
    ELSE
      (SELECT id FROM categories WHERE name = 'Self-Care' LIMIT 1)
  END
)
WHERE category_id IS NULL;
