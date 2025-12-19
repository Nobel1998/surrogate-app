-- Create case_managers table for multiple managers per case
CREATE TABLE IF NOT EXISTS case_managers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
  manager_id UUID REFERENCES admin_users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(case_id, manager_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_case_managers_case_id ON case_managers(case_id);
CREATE INDEX IF NOT EXISTS idx_case_managers_manager_id ON case_managers(manager_id);

-- Enable RLS
ALTER TABLE case_managers ENABLE ROW LEVEL SECURITY;

-- Create policy (service role can access all)
DROP POLICY IF EXISTS "Service role can access case_managers" ON case_managers;
CREATE POLICY "Service role can access case_managers"
  ON case_managers
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Add comment
COMMENT ON TABLE case_managers IS 'Many-to-many relationship between cases and managers';
