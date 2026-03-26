-- Add menstrual_period_date column to surrogate_matches table
-- This allows administrators/branch managers to track menstrual period date for the match

ALTER TABLE surrogate_matches
  ADD COLUMN IF NOT EXISTS menstrual_period_date DATE;

COMMENT ON COLUMN surrogate_matches.menstrual_period_date IS 'Menstrual period date for the match';

