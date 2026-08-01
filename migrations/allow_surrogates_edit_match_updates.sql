-- Allow matched surrogates to edit admin notes (match_updates) and manage images.
-- Parents remain SELECT-only. Service role keeps full access.

DROP POLICY IF EXISTS "Matched surrogates can update own match updates" ON match_updates;
CREATE POLICY "Matched surrogates can update own match updates"
  ON match_updates
  FOR UPDATE
  TO authenticated
  USING (
    update_type = 'admin_note'
    AND EXISTS (
      SELECT 1 FROM surrogate_matches sm
      WHERE sm.id = match_updates.match_id
        AND sm.surrogate_id = auth.uid()
    )
  )
  WITH CHECK (
    update_type = 'admin_note'
    AND EXISTS (
      SELECT 1 FROM surrogate_matches sm
      WHERE sm.id = match_updates.match_id
        AND sm.surrogate_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Matched surrogates can insert match update images" ON match_update_images;
CREATE POLICY "Matched surrogates can insert match update images"
  ON match_update_images
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM match_updates mu
      JOIN surrogate_matches sm ON sm.id = mu.match_id
      WHERE mu.id = match_update_images.update_id
        AND mu.update_type = 'admin_note'
        AND sm.surrogate_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Matched surrogates can delete match update images" ON match_update_images;
CREATE POLICY "Matched surrogates can delete match update images"
  ON match_update_images
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM match_updates mu
      JOIN surrogate_matches sm ON sm.id = mu.match_id
      WHERE mu.id = match_update_images.update_id
        AND mu.update_type = 'admin_note'
        AND sm.surrogate_id = auth.uid()
    )
  );
