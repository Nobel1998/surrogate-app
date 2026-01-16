-- Fix surrogate_matches status constraint to ensure 'matched' is included
-- This migration ensures the constraint includes all valid statuses: matched, completed, cancelled, pending, pregnant
-- Run this in Supabase SQL Editor

-- Step 1: First, update any invalid status values to valid ones
-- Update 'active' status to 'matched' (if any exist)
UPDATE surrogate_matches
SET status = 'matched'
WHERE status = 'active';

-- Update any NULL status to 'pending' (if any exist)
UPDATE surrogate_matches
SET status = 'pending'
WHERE status IS NULL;

-- Update any other invalid status values to 'pending' as a safe default
-- This catches any unexpected status values
UPDATE surrogate_matches
SET status = 'pending'
WHERE status NOT IN ('matched', 'completed', 'cancelled', 'pending', 'pregnant');

-- Step 2: Drop ALL possible CHECK constraints on status column
-- Try to drop with different possible constraint names
ALTER TABLE surrogate_matches
  DROP CONSTRAINT IF EXISTS surrogate_matches_status_check;

-- Also try dropping any constraint that might be named differently
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'surrogate_matches'::regclass
        AND contype = 'c'
        AND pg_get_constraintdef(oid) LIKE '%status%'
    ) LOOP
        EXECUTE 'ALTER TABLE surrogate_matches DROP CONSTRAINT IF EXISTS ' || quote_ident(r.conname);
    END LOOP;
END $$;

-- Step 3: Verify all existing rows have valid status values before adding constraint
-- This ensures no existing data violates the new constraint
DO $$
BEGIN
    -- Check if there are any rows with invalid status
    IF EXISTS (
        SELECT 1 FROM surrogate_matches 
        WHERE status IS NOT NULL 
        AND status NOT IN ('matched', 'completed', 'cancelled', 'pending', 'pregnant')
    ) THEN
        RAISE EXCEPTION 'Found rows with invalid status values. Please update them first.';
    END IF;
END $$;

-- Step 4: Add the correct CHECK constraint with all valid statuses
ALTER TABLE surrogate_matches
  ADD CONSTRAINT surrogate_matches_status_check 
  CHECK (status IN ('matched', 'completed', 'cancelled', 'pending', 'pregnant'));

-- Add comment for documentation
COMMENT ON COLUMN surrogate_matches.status IS 'Match status: matched, completed, cancelled, pending, or pregnant';
