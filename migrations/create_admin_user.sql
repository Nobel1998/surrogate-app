-- Example script to create an admin user
-- Replace 'your-admin-username' and 'your-password' with actual values
-- Run this in Supabase SQL Editor after running add_admin_auth_fields.sql

-- First, create a profile for the admin (or update existing one)
-- You need to hash the password first using bcrypt
-- Example: bcrypt.hash('your-password', 10) = '$2a$10$...'

-- Option 1: Update existing profile to be admin
-- UPDATE profiles 
-- SET 
--   role = 'admin',
--   admin_username = 'admin',
--   admin_password_hash = '$2a$10$YourHashedPasswordHere'
-- WHERE id = 'existing-user-id';

-- Option 2: Create new admin profile
-- Note: You'll need to create a user in auth.users first, or use an existing user_id
-- INSERT INTO profiles (id, name, role, admin_username, admin_password_hash)
-- VALUES (
--   'new-user-uuid-here',
--   'Admin User',
--   'admin',
--   'admin',
--   '$2a$10$YourHashedPasswordHere'
-- );

-- To hash a password, you can use Node.js:
-- const bcrypt = require('bcryptjs');
-- const hash = await bcrypt.hash('your-password', 10);
-- console.log(hash);
