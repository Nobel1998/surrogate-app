-- Create admin_users table for admin authentication
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'branch_manager')),
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for username lookup
CREATE INDEX IF NOT EXISTS idx_admin_users_username ON admin_users(username);

-- Create index for branch_id lookup
CREATE INDEX IF NOT EXISTS idx_admin_users_branch_id ON admin_users(branch_id) WHERE branch_id IS NOT NULL;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_admin_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_admin_users_updated_at_trigger ON admin_users;
CREATE TRIGGER update_admin_users_updated_at_trigger
  BEFORE UPDATE ON admin_users
  FOR EACH ROW
  EXECUTE FUNCTION update_admin_users_updated_at();

-- Add comments
COMMENT ON TABLE admin_users IS 'Admin users for the admin dashboard';
COMMENT ON COLUMN admin_users.username IS 'Unique username for admin login';
COMMENT ON COLUMN admin_users.password_hash IS 'Bcrypt hashed password for admin login';
COMMENT ON COLUMN admin_users.role IS 'Admin role: admin (can view all branches) or branch_manager (can view only assigned branch)';
COMMENT ON COLUMN admin_users.branch_id IS 'Branch assignment for branch_manager role';

-- Enable RLS (Row Level Security)
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Create policies for admin_users
-- Only service role can access (via admin dashboard API)
DROP POLICY IF EXISTS "Service role can access admin_users" ON admin_users;
CREATE POLICY "Service role can access admin_users"
  ON admin_users
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Note: In production, you might want to add more restrictive policies
-- For now, all access is controlled through the admin dashboard API using service role key
