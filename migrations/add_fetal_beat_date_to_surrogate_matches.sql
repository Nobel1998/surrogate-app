-- Add fetal_beat_date column to surrogate_matches table
-- This stores the date when fetal heartbeat was confirmed

ALTER TABLE surrogate_matcheså
  ADD COLUMN IF NOT EXISTS fetal_beat_date DATE;

-- Add comment for documentation
COMMENT ON COLUMN surrogate_matches.fetal_beat_date IS 'Date when fetal heartbeat was confirmed';
