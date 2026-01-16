-- Update 'cancelled' status to 'matched' in surrogate_matches table
-- This migration updates existing records and the CHECK constraint

-- Step 1: Update existing records with 'cancelled' status to 'matched'
UPDATE surrogate_matches
SET status = 'matched'
WHERE status = 'cancelled';

-- Step 2: Drop the existing CHECK constraint
ALTER TABLE surrogate_matches
  DROP CONSTRAINT IF EXISTS surrogate_matches_status_check;

-- Step 3: Add the new CHECK constraint with 'matched' instead of 'cancelled'
ALTER TABLE surrogate_matches
  ADD CONSTRAINT surrogate_matches_status_check 
  CHECK (status IN ('active', 'completed', 'matched', 'pending', 'pregnant'));

-- Add comment for documentation
COMMENT ON COLUMN surrogate_matches.status IS 'Match status: active, completed, matched, pending, or pregnant';
