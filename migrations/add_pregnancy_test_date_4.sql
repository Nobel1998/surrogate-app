-- Add pregnancy_test_date_4 column to surrogate_matches table
-- This migration adds the 4th pregnancy test date field
-- Safe to run even if previous migrations have already added pregnancy_test_date_2 and pregnancy_test_date_3

ALTER TABLE surrogate_matches
  ADD COLUMN IF NOT EXISTS pregnancy_test_date_4 DATE;

-- Add comment for documentation
COMMENT ON COLUMN surrogate_matches.pregnancy_test_date_4 IS 'Fourth pregnancy test date';
