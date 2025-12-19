-- Create cases table for internal case management
CREATE TABLE IF NOT EXISTS cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id TEXT UNIQUE NOT NULL,
  surrogate_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  first_parent_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  second_parent_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  case_type TEXT NOT NULL CHECK (case_type IN ('Surrogacy', 'Egg Donation', 'Embryo Donation')),
  manager_id UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  current_step TEXT,
  
  -- Pregnancy information
  weeks_pregnant INTEGER DEFAULT 0,
  estimated_due_date DATE,
  number_of_fetuses INTEGER DEFAULT 0,
  fetal_beat_confirm TEXT DEFAULT 'None',
  
  -- Important dates
  sign_date DATE,
  transfer_date DATE,
  beta_confirm_date DATE,
  due_date DATE,
  
  -- Clinic and medical information
  clinic TEXT,
  embryos TEXT,
  
  -- Legal and financial
  lawyer TEXT,
  company TEXT,
  
  -- File references (stored as JSONB for flexibility)
  files JSONB DEFAULT '{}'::jsonb,
  
  -- Status and progress
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled', 'on_hold')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES admin_users(id) ON DELETE SET NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_cases_claim_id ON cases(claim_id);
CREATE INDEX IF NOT EXISTS idx_cases_surrogate_id ON cases(surrogate_id);
CREATE INDEX IF NOT EXISTS idx_cases_first_parent_id ON cases(first_parent_id);
CREATE INDEX IF NOT EXISTS idx_cases_manager_id ON cases(manager_id);
CREATE INDEX IF NOT EXISTS idx_cases_branch_id ON cases(branch_id);
CREATE INDEX IF NOT EXISTS idx_cases_status ON cases(status);
CREATE INDEX IF NOT EXISTS idx_cases_created_at ON cases(created_at DESC);

-- Create case_steps table to track step progress
CREATE TABLE IF NOT EXISTS case_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
  stage_number INTEGER NOT NULL,
  stage_name TEXT NOT NULL,
  step_number INTEGER NOT NULL,
  step_name TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'skipped')),
  completed_at TIMESTAMP WITH TIME ZONE,
  completed_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(case_id, stage_number, step_number)
);

CREATE INDEX IF NOT EXISTS idx_case_steps_case_id ON case_steps(case_id);
CREATE INDEX IF NOT EXISTS idx_case_steps_status ON case_steps(status);

-- Create case_updates table for admin updates/logs
CREATE TABLE IF NOT EXISTS case_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
  update_type TEXT NOT NULL CHECK (update_type IN ('status', 'step', 'admin_note', 'transaction', 'file_upload')),
  title TEXT,
  content TEXT,
  amount DECIMAL(10, 2), -- For transactions
  status TEXT, -- For transactions/updates
  updated_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_case_updates_case_id ON case_updates(case_id);
CREATE INDEX IF NOT EXISTS idx_case_updates_created_at ON case_updates(created_at DESC);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_cases_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_case_steps_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS update_cases_updated_at_trigger ON cases;
CREATE TRIGGER update_cases_updated_at_trigger
  BEFORE UPDATE ON cases
  FOR EACH ROW
  EXECUTE FUNCTION update_cases_updated_at();

DROP TRIGGER IF EXISTS update_case_steps_updated_at_trigger ON case_steps;
CREATE TRIGGER update_case_steps_updated_at_trigger
  BEFORE UPDATE ON case_steps
  FOR EACH ROW
  EXECUTE FUNCTION update_case_steps_updated_at();

-- Enable RLS
ALTER TABLE cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_updates ENABLE ROW LEVEL SECURITY;

-- Create policies (service role can access all)
DROP POLICY IF EXISTS "Service role can access cases" ON cases;
CREATE POLICY "Service role can access cases"
  ON cases
  FOR ALL
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can access case_steps" ON case_steps;
CREATE POLICY "Service role can access case_steps"
  ON case_steps
  FOR ALL
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can access case_updates" ON case_updates;
CREATE POLICY "Service role can access case_updates"
  ON case_updates
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Add comments
COMMENT ON TABLE cases IS 'Internal case management for agency staff';
COMMENT ON COLUMN cases.claim_id IS 'Unique claim/case identifier';
COMMENT ON COLUMN cases.files IS 'JSONB object storing file references for various document types';
COMMENT ON TABLE case_steps IS 'Tracks step-by-step progress for each case';
COMMENT ON TABLE case_updates IS 'Admin updates, notes, and transaction logs for cases';
