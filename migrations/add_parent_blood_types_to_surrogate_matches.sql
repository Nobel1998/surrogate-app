-- Add parent blood type columns to surrogate_matches table
-- This allows storing blood types for first_parent and second_parent separately

ALTER TABLE surrogate_matches
  ADD COLUMN IF NOT EXISTS first_parent_blood_type TEXT,
  ADD COLUMN IF NOT EXISTS second_parent_blood_type TEXT;

-- Add comments for documentation
COMMENT ON COLUMN surrogate_matches.first_parent_blood_type IS 'Blood type of the first parent';
COMMENT ON COLUMN surrogate_matches.second_parent_blood_type IS 'Blood type of the second parent';
