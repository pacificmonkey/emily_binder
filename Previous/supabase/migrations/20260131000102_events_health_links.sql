-- Migration 102: Add recurrence and health links to events
-- Emily Mission Log

-- =============================================================================
-- EVENT CATEGORY ENUM
-- =============================================================================

CREATE TYPE event_category AS ENUM (
  'general',           -- Regular calendar event
  'medication',        -- Medication reminder (take meds)
  'appointment',       -- Healthcare appointment
  'refill'            -- Medication refill reminder
);

-- =============================================================================
-- ADD NEW COLUMNS TO EVENTS TABLE
-- =============================================================================

-- Event category
ALTER TABLE events
ADD COLUMN category event_category NOT NULL DEFAULT 'general';

-- Recurrence fields (reusing existing recurrence_pattern type from missions)
ALTER TABLE events
ADD COLUMN is_recurring BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE events
ADD COLUMN recurrence_pattern recurrence_pattern;

ALTER TABLE events
ADD COLUMN weekday_flags INTEGER; -- Bitmask for specific weekdays (1=Mon, 2=Tue, 4=Wed, etc.)

ALTER TABLE events
ADD COLUMN recurrence_end_date DATE; -- Optional end date for recurrence

-- Health links
ALTER TABLE events
ADD COLUMN health_medication_id UUID REFERENCES health_medications(id) ON DELETE SET NULL;

ALTER TABLE events
ADD COLUMN health_provider_id UUID REFERENCES health_providers(id) ON DELETE SET NULL;

-- =============================================================================
-- ADD CONSTRAINTS
-- =============================================================================

-- Recurring events must have a pattern
ALTER TABLE events
ADD CONSTRAINT events_recurring_pattern_check CHECK (
  is_recurring = false OR recurrence_pattern IS NOT NULL
);

-- Specific weekdays pattern must have weekday flags
ALTER TABLE events
ADD CONSTRAINT events_weekday_flags_check CHECK (
  recurrence_pattern != 'specific_weekdays' OR (
    weekday_flags IS NOT NULL AND weekday_flags > 0 AND weekday_flags < 128
  )
);

-- Medication category should have medication link
ALTER TABLE events
ADD CONSTRAINT events_medication_category_check CHECK (
  category != 'medication' OR health_medication_id IS NOT NULL
);

-- Appointment category should have provider link
ALTER TABLE events
ADD CONSTRAINT events_appointment_category_check CHECK (
  category != 'appointment' OR health_provider_id IS NOT NULL
);

-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX idx_events_medication ON events(health_medication_id) WHERE health_medication_id IS NOT NULL;
CREATE INDEX idx_events_provider ON events(health_provider_id) WHERE health_provider_id IS NOT NULL;
CREATE INDEX idx_events_category ON events(owner_user_id, category) WHERE archived = false;
CREATE INDEX idx_events_recurring ON events(owner_user_id, is_recurring) WHERE is_recurring = true AND archived = false;

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON COLUMN events.category IS 'Type of event: general, medication reminder, appointment, or refill reminder';
COMMENT ON COLUMN events.is_recurring IS 'Whether this event repeats';
COMMENT ON COLUMN events.recurrence_pattern IS 'How often the event repeats: daily, weekly, or specific_weekdays';
COMMENT ON COLUMN events.weekday_flags IS 'Bitmask for specific weekdays (1=Mon, 2=Tue, 4=Wed, 8=Thu, 16=Fri, 32=Sat, 64=Sun)';
COMMENT ON COLUMN events.recurrence_end_date IS 'Optional end date for recurring events';
COMMENT ON COLUMN events.health_medication_id IS 'Link to medication for medication reminders';
COMMENT ON COLUMN events.health_provider_id IS 'Link to care team member for appointments';
