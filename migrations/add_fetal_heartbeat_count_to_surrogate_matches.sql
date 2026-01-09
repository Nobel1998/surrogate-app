-- Add fetal_heartbeat_count column to surrogate_matches table
-- This stores the number of fetal heartbeats detected

ALTER TABLE surrogate_matches
  ADD COLUMN IF NOT EXISTS fetal_heartbeat_count INTEGER;

-- Add comment for documentation
COMMENT ON COLUMN surrogate_matches.fetal_heartbeat_count IS 'Number of fetal heartbeats detected';
