-- Create branches table for office/branch management
CREATE TABLE IF NOT EXISTS branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  code TEXT NOT NULL UNIQUE, -- e.g., 'main', 'high_desert', 'coachella_valley', etc.
  address TEXT,
  phone TEXT,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add branch_id to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_branch_id ON profiles(branch_id);

-- Add branch_id to surrogate_matches table
ALTER TABLE surrogate_matches ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_surrogate_matches_branch_id ON surrogate_matches(branch_id);

-- Insert default branches based on Contact Us information
INSERT INTO branches (name, code, address, phone, email) VALUES
  ('Main Office (Toll-Free)', 'main', '961 W Holt Blvd, Ontario, CA 91762', '(888) 245-1866', 'info@babytreesurrogacy.com'),
  ('High Desert Office', 'high_desert', NULL, '(760) 223-7500', 'highdesert@babytreesurrogacy.com'),
  ('Coachella Valley Office', 'coachella_valley', NULL, '(760) 904-2600', 'coachellavalley@babytreesurrogacy.com'),
  ('Antelope Valley Office', 'antelope_valley', NULL, '(661) 471-3100', 'antelopevalley@babytreesurrogacy.com'),
  ('San Diego Office', 'san_diego', NULL, '(619) 396-9214', 'sandiego@babytreesurrogacy.com')
ON CONFLICT (code) DO NOTHING;

-- Add role field to profiles if it doesn't exist (for admin/branch_manager roles)
-- Note: This assumes 'role' already exists, but we'll add admin/branch_manager support
-- Admin role: 'admin' (can see all branches)
-- Branch Manager role: 'branch_manager' (can only see their branch)
-- Existing roles: 'surrogate', 'parent'

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_branches_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_branches_updated_at_trigger ON branches;
CREATE TRIGGER update_branches_updated_at_trigger
  BEFORE UPDATE ON branches
  FOR EACH ROW
  EXECUTE FUNCTION update_branches_updated_at();

-- Add comments
COMMENT ON TABLE branches IS 'Office/branch locations for the surrogacy agency';
COMMENT ON COLUMN branches.code IS 'Unique code identifier for the branch (e.g., main, high_desert)';
COMMENT ON COLUMN profiles.branch_id IS 'Branch/office assignment for the user';
COMMENT ON COLUMN surrogate_matches.branch_id IS 'Branch/office assignment for the match (inherited from surrogate)';
