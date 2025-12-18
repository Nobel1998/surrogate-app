-- Add admin authentication fields to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS admin_username TEXT UNIQUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS admin_password_hash TEXT;

-- Create index for admin_username lookup
CREATE INDEX IF NOT EXISTS idx_profiles_admin_username ON profiles(admin_username) WHERE admin_username IS NOT NULL;

-- Add comments
COMMENT ON COLUMN profiles.admin_username IS 'Username for admin login (only for admin and branch_manager roles)';
COMMENT ON COLUMN profiles.admin_password_hash IS 'Bcrypt hashed password for admin login';
