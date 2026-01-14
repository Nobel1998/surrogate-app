-- Add additional pregnancy test date columns to surrogate_matches table
-- This allows tracking multiple pregnancy tests (at least 3 total)

ALTER TABLE surrogate_matches
  ADD COLUMN IF NOT EXISTS pregnancy_test_date_2 DATE,
  ADD COLUMN IF NOT EXISTS pregnancy_test_date_3 DATE;

-- Add comments for documentation
COMMENT ON COLUMN surrogate_matches.pregnancy_test_date_2 IS 'Second pregnancy test date';
COMMENT ON COLUMN surrogate_matches.pregnancy_test_date_3 IS 'Third pregnancy test date';
