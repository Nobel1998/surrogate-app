-- Allow authenticated users (e.g. parents) to read surrogate profiles
-- so that "Available Surrogates" list in My Match can be shown to unmatched parents.
-- Without this, RLS typically allows only reading own profile, so parents get empty list.

-- Ensure RLS is enabled (no-op if already enabled)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Allow SELECT on rows where role = 'surrogate' for any authenticated user
-- (needed for app: parent sees list of available surrogates by id, name, phone, location, available)
DROP POLICY IF EXISTS "Authenticated users can read surrogate profiles for matching" ON profiles;
CREATE POLICY "Authenticated users can read surrogate profiles for matching"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (role = 'surrogate');

COMMENT ON POLICY "Authenticated users can read surrogate profiles for matching" ON profiles IS
  'Allows parents to load Available Surrogates list in My Match (id, name, phone, location, available).';
