-- Add sort_order column to missions table for persistent drag ordering
ALTER TABLE missions ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- Add is_snoozable column for snooze permission control
-- If true, any user can snooze this mission
-- If false, only the owner can snooze it
ALTER TABLE missions ADD COLUMN IF NOT EXISTS is_snoozable BOOLEAN DEFAULT false;

-- Create index for efficient sorting queries
CREATE INDEX IF NOT EXISTS idx_missions_sort_order
  ON missions(owner_user_id, sort_order)
  WHERE archived = false;

-- Comment for clarity
COMMENT ON COLUMN missions.sort_order IS 'Order within today/week list for drag-and-drop reordering';
COMMENT ON COLUMN missions.is_snoozable IS 'If true, any user can snooze this mission. If false, only the owner can snooze.';
