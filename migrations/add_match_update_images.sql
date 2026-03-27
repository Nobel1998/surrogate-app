-- Image attachments for match updates (e.g. admin notes on case detail).
-- Stored files live in Supabase Storage bucket `documents` under admin-updates/{match_id}/...

CREATE TABLE IF NOT EXISTS match_update_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  update_id UUID NOT NULL REFERENCES match_updates(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  file_name TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_match_update_images_update_id ON match_update_images(update_id);
CREATE INDEX IF NOT EXISTS idx_match_update_images_update_sort ON match_update_images(update_id, sort_order);

COMMENT ON TABLE match_update_images IS 'Image attachments for match updates; deleted with parent match_updates row';

ALTER TABLE match_update_images ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access match_update_images" ON match_update_images;
CREATE POLICY "Service role full access match_update_images"
  ON match_update_images
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Matched users can view own match update images" ON match_update_images;
CREATE POLICY "Matched users can view own match update images"
  ON match_update_images
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM match_updates mu
      JOIN surrogate_matches sm ON sm.id = mu.match_id
      WHERE mu.id = match_update_images.update_id
        AND (sm.parent_id = auth.uid() OR sm.surrogate_id = auth.uid())
    )
  );
