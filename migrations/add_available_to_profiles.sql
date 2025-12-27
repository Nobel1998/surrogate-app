-- Add available field to profiles table for surrogate matching
-- This allows admins to control which surrogates are available for matching

-- Add available column to profiles table
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS available BOOLEAN DEFAULT false;

-- Create index for faster queries when filtering available surrogates
CREATE INDEX IF NOT EXISTS idx_profiles_available ON profiles(available) WHERE role = 'surrogate';

-- Add comment for documentation
COMMENT ON COLUMN profiles.available IS 'Whether the surrogate is available for matching (admin-controlled)';

