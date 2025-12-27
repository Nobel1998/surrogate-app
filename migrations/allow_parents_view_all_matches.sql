-- Allow authenticated users (parents) to view all surrogate_matches
-- This is needed so parents can see which surrogates are already matched
-- when browsing available surrogates

-- Drop existing restrictive policies if they exist
DROP POLICY IF EXISTS "Users can view own matches" ON surrogate_matches;
DROP POLICY IF EXISTS "Surrogates can view own matches" ON surrogate_matches;
DROP POLICY IF EXISTS "Parents can view own matches" ON surrogate_matches;

-- Create a policy that allows authenticated users to view all matches
-- This is safe because:
-- 1. We only allow SELECT (read-only)
-- 2. Users can only see match records, not modify them
-- 3. This is necessary for the matching feature to work correctly
CREATE POLICY "Authenticated users can view all matches"
  ON surrogate_matches
  FOR SELECT
  TO authenticated
  USING (true);

-- Keep existing policies for INSERT/UPDATE/DELETE if needed
-- Users should only be able to modify their own matches (if any policies exist for that)

COMMENT ON POLICY "Authenticated users can view all matches" ON surrogate_matches IS 
  'Allows authenticated users to view all match records. This is necessary for parents to see which surrogates are already matched when browsing available surrogates.';

