-- Migration: Add departure_time column to planned_visits
-- This column tracks when non-matched visits depart

-- Add departure_time column
ALTER TABLE planned_visits ADD COLUMN departure_time TIMESTAMP;

-- Add comment
COMMENT ON COLUMN planned_visits.departure_time IS 'Timestamp when the visit departed (for non-matched plates)';
