-- Update 'active' status to 'matched' in surrogate_matches table
-- This migration updates existing records and the CHECK constraint

-- Step 1: Update existing records with 'active' status to 'matched'
UPDATE surrogate_matches
SET status = 'matched'
WHERE status = 'active';

-- Step 2: Drop the existing CHECK constraint
ALTER TABLE surrogate_matches
  DROP CONSTRAINT IF EXISTS surrogate_matches_status_check;

-- Step 3: Add the new CHECK constraint with 'matched' instead of 'active'
ALTER TABLE surrogate_matches
  ADD CONSTRAINT surrogate_matches_status_check 
  CHECK (status IN ('matched', 'completed', 'cancelled', 'pending', 'pregnant'));

-- Add comment for documentation
COMMENT ON COLUMN surrogate_matches.status IS 'Match status: matched, completed, cancelled, pending, or pregnant';
