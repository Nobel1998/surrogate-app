-- Add 'pregnant' status option to surrogate_matches table
-- This migration updates the CHECK constraint on the status column to include 'pregnant'

-- Step 1: Drop the existing CHECK constraint
ALTER TABLE surrogate_matches
  DROP CONSTRAINT IF EXISTS surrogate_matches_status_check;

-- Step 2: Add the new CHECK constraint with 'pregnant' included
ALTER TABLE surrogate_matches
  ADD CONSTRAINT surrogate_matches_status_check 
  CHECK (status IN ('active', 'completed', 'cancelled', 'pending', 'pregnant'));

-- Add comment for documentation
COMMENT ON COLUMN surrogate_matches.status IS 'Match status: active, completed, cancelled, pending, or pregnant';
