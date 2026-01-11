-- Add legal_clearance_date column to surrogate_matches table
-- This allows administrators to track when legal clearance was obtained

ALTER TABLE surrogate_matches
  ADD COLUMN IF NOT EXISTS legal_clearance_date DATE;

-- Add comment for documentation
COMMENT ON COLUMN surrogate_matches.legal_clearance_date IS 'Date when legal clearance was obtained for the match';
