-- Remove admin authentication fields from profiles table
-- This migration should be run after creating admin_users table and migrating data

-- Drop the unique constraint on admin_username first
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_admin_username_key;

-- Drop the index
DROP INDEX IF EXISTS idx_profiles_admin_username;

-- Remove the columns
ALTER TABLE profiles DROP COLUMN IF EXISTS admin_username;
ALTER TABLE profiles DROP COLUMN IF EXISTS admin_password_hash;

-- Note: If you have existing admin users in profiles table, you should migrate them first:
-- INSERT INTO admin_users (id, name, username, password_hash, role, branch_id)
-- SELECT id, name, admin_username, admin_password_hash, role, branch_id
-- FROM profiles
-- WHERE admin_username IS NOT NULL AND role IN ('admin', 'branch_manager');
