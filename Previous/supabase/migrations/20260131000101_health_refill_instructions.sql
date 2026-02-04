-- Migration 101: Add refill instruction fields to medications
-- Emily Mission Log

-- Add refill instructions - how to get a regular refill
ALTER TABLE health_medications
ADD COLUMN refill_instructions TEXT;

-- Add renewal instructions - what to do when no refills remain
ALTER TABLE health_medications
ADD COLUMN renewal_instructions TEXT;

-- Add comments explaining the fields
COMMENT ON COLUMN health_medications.refill_instructions IS 'Instructions for getting a regular refill (e.g., "Call pharmacy", "Use app", "Auto-refill enabled")';
COMMENT ON COLUMN health_medications.renewal_instructions IS 'Instructions for when no refills remain (e.g., "Schedule appointment with Dr. Smith", "Call office for new prescription")';
