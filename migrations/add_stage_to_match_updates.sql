-- Add optional stage to match_updates for admin notes (e.g. Pre-Transfer, OB Visit, Delivery)

ALTER TABLE match_updates
  ADD COLUMN IF NOT EXISTS stage TEXT;

COMMENT ON COLUMN match_updates.stage IS 'Optional stage for admin_note: pre_transfer, ob_visit, delivery, or null for general';
