-- Add address column to profiles table for detailed address from surrogate application
-- location: approximate location (used during registration)
-- address: full detailed address (used in surrogate application form)

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS address TEXT;

COMMENT ON COLUMN profiles.address IS 'Full detailed address from surrogate application form (Street, City, State, Zip)';
COMMENT ON COLUMN profiles.location IS 'Approximate location (City, State) used during registration';

