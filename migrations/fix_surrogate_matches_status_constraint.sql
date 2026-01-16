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

-- Step 2: Drop the existing CHECK constraint
ALTER TABLE surrogate_matches
  DROP CONSTRAINT IF EXISTS surrogate_matches_status_check;

-- Step 3: Add the correct CHECK constraint with all valid statuses
ALTER TABLE surrogate_matches
  ADD CONSTRAINT surrogate_matches_status_check 
  CHECK (status IN ('matched', 'completed', 'cancelled', 'pending', 'pregnant'));

-- Add comment for documentation
COMMENT ON COLUMN surrogate_matches.status IS 'Match status: matched, completed, cancelled, pending, or pregnant';
