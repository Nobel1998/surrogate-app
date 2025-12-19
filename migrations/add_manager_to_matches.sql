-- Add manager_id to surrogate_matches table
-- This allows assigning a case manager directly to a match
ALTER TABLE surrogate_matches ADD COLUMN IF NOT EXISTS manager_id UUID REFERENCES admin_users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_surrogate_matches_manager_id ON surrogate_matches(manager_id);

COMMENT ON COLUMN surrogate_matches.manager_id IS 'Case manager assigned to this match';
