-- Migration 100: Add pills_per_day to medications for supply calculations
-- Emily Mission Log

-- Add pills_per_day column for calculating when medications run out
ALTER TABLE health_medications
ADD COLUMN pills_per_day NUMERIC(5,2);

-- Add comment explaining the field
COMMENT ON COLUMN health_medications.pills_per_day IS 'Number of pills taken per day (e.g., 1, 0.5 for every other day, 2 for twice daily)';
