-- Allow surrogates to update transfer_date in their own matches
-- This is needed so surrogates can sync transfer_date from profiles to surrogate_matches
-- when they update it in the mobile app

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Surrogates can update transfer_date in own matches" ON surrogate_matches;

-- Create policy for surrogates to update transfer_date in their own matches
CREATE POLICY "Surrogates can update transfer_date in own matches"
  ON surrogate_matches
  FOR UPDATE
  TO authenticated
  USING (surrogate_id = auth.uid())
  WITH CHECK (surrogate_id = auth.uid());

COMMENT ON POLICY "Surrogates can update transfer_date in own matches" ON surrogate_matches IS 
  'Allows surrogates to update transfer_date in their own match records. This enables syncing transfer_date from profiles table when surrogates update it in the mobile app.';
