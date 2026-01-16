-- Fix surrogate_matches status constraint to ensure 'matched' is included
-- This migration ensures the constraint includes all valid statuses: matched, completed, cancelled, pending, pregnant
-- Run this in Supabase SQL Editor

-- Step 1: Drop the existing CHECK constraint
ALTER TABLE surrogate_matches
  DROP CONSTRAINT IF EXISTS surrogate_matches_status_check;

-- Step 2: Add the correct CHECK constraint with all valid statuses
ALTER TABLE surrogate_matches
  ADD CONSTRAINT surrogate_matches_status_check 
  CHECK (status IN ('matched', 'completed', 'cancelled', 'pending', 'pregnant'));

-- Add comment for documentation
COMMENT ON COLUMN surrogate_matches.status IS 'Match status: matched, completed, cancelled, pending, or pregnant';
