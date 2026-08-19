-- Allow matched surrogates to read their matched parent's intended-parent application
-- (needed for My Match → Intended Parents Profile)

DROP POLICY IF EXISTS "Matched surrogates can view parent intended parent applications"
  ON intended_parent_applications;

CREATE POLICY "Matched surrogates can view parent intended parent applications"
  ON intended_parent_applications
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM surrogate_matches sm
      WHERE sm.surrogate_id = auth.uid()
        AND (
          sm.parent_id = intended_parent_applications.user_id
          OR sm.first_parent_id = intended_parent_applications.user_id
        )
        AND lower(coalesce(sm.status, '')) IN ('matched', 'active', 'pregnant', 'pending')
    )
  );

COMMENT ON POLICY "Matched surrogates can view parent intended parent applications"
  ON intended_parent_applications IS
  'Surrogates in an active match can view the matched parent account''s intended parent application (Parent 1 + Parent 2 form data).';
