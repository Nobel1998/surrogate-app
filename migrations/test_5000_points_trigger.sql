-- Test script: Set a user's points to 4800 to test 5000 points trigger
-- Replace 'USER_ID_HERE' with the actual surrogate user ID you want to test
-- Run this in Supabase SQL Editor

-- Step 1: Find a surrogate user ID (optional - to help you find the user)
-- SELECT id, name, email, role, total_points 
-- FROM profiles 
-- WHERE role = 'surrogate' 
-- ORDER BY created_at DESC 
-- LIMIT 5;

-- Step 2: Clear existing points for the test user (replace USER_ID_HERE)
-- DELETE FROM points_rewards WHERE user_id = 'USER_ID_HERE';
-- UPDATE profiles SET total_points = 0 WHERE id = 'USER_ID_HERE';

-- Step 3: Add points to reach 4800 (so next check-in will trigger 5000)
-- Add 24 base hits (200 points each) = 4800 points
-- INSERT INTO points_rewards (user_id, points, reward_type, source_type, description)
-- SELECT 
--   'USER_ID_HERE'::uuid,
--   200,
--   'base_hit',
--   'test',
--   'Test base hit reward - ' || generate_series
-- FROM generate_series(1, 24);

-- The trigger will automatically update total_points in profiles to 4800

-- Step 4: Verify the points
-- SELECT 
--   p.id,
--   p.name,
--   p.total_points,
--   (SELECT SUM(points) FROM points_rewards WHERE user_id = p.id) as calculated_points,
--   (SELECT COUNT(*) FROM points_rewards WHERE user_id = p.id) as reward_count
-- FROM profiles p
-- WHERE p.id = 'USER_ID_HERE';

-- Step 5: Now when the user submits a medical report:
-- - If same-day upload: +250 points (200 base + 50 speed) = 5050 total → triggers reward
-- - If not same-day: +200 points = 5000 total → triggers reward

-- Step 6: Check if reward request was created
-- SELECT * FROM reward_requests WHERE user_id = 'USER_ID_HERE' ORDER BY created_at DESC;

-- Alternative: Set directly to 4800 for quick test
-- UPDATE profiles SET total_points = 4800 WHERE id = 'USER_ID_HERE';
