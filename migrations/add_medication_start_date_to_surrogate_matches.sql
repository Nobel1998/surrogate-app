-- Add medication_start_date column to surrogate_matches table
-- This allows administrators to track when medication started for the surrogate

ALTER TABLE surrogate_matches
  ADD COLUMN IF NOT EXISTS medication_start_date DATE;

-- Add comment for documentation
COMMENT ON COLUMN surrogate_matches.medication_start_date IS 'Date when medication started for the surrogate';
