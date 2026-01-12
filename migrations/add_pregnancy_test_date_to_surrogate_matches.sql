-- Add pregnancy_test_date column to surrogate_matches table
-- This allows administrators to track when pregnancy test was performed

ALTER TABLE surrogate_matches
  ADD COLUMN IF NOT EXISTS pregnancy_test_date DATE;

-- Add comment for documentation
COMMENT ON COLUMN surrogate_matches.pregnancy_test_date IS 'Date when pregnancy test was performed';
