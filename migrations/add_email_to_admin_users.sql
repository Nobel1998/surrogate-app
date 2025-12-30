-- Add email column to admin_users table
ALTER TABLE admin_users
  ADD COLUMN IF NOT EXISTS email TEXT;

-- Create index for email lookup
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email) WHERE email IS NOT NULL;

-- Add comment
COMMENT ON COLUMN admin_users.email IS 'Email address for admin user (optional)';

