-- Allow matched parent/surrogate to read their match's admin notes in the app.
-- Restrict full access to service_role; grant SELECT to authenticated users for their own match.

ALTER TABLE match_updates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role can access match_updates" ON match_updates;

CREATE POLICY "Service role full access match_updates"
  ON match_updates
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Matched users can view own match updates"
  ON match_updates
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM surrogate_matches sm
      WHERE sm.id = match_updates.match_id
        AND (sm.parent_id = auth.uid() OR sm.surrogate_id = auth.uid())
    )
  );
