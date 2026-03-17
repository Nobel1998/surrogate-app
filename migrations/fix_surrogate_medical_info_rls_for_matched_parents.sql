-- Fix RLS policy for surrogate_medical_info table
-- The policy was checking for status = 'active' but the system uses status = 'matched'

-- Drop the existing policy
DROP POLICY IF EXISTS "Parents can view matched surrogate's medical info" ON surrogate_medical_info;

-- Create corrected policy with status = 'matched'
CREATE POLICY "Parents can view matched surrogate's medical info"
  ON surrogate_medical_info
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM surrogate_matches
      WHERE surrogate_matches.parent_id = auth.uid()
        AND surrogate_matches.surrogate_id = surrogate_medical_info.user_id
        AND surrogate_matches.status = 'matched'
    )
  );
