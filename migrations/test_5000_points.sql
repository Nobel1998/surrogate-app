-- Test script: Set a user's points to 5000 to test reward request trigger
-- Replace 'USER_ID_HERE' with the actual user ID you want to test
-- Run this in Supabase SQL Editor

-- Option 1: Set total_points directly (quick test)
-- UPDATE profiles 
-- SET total_points = 5000 
-- WHERE id = 'USER_ID_HERE';

-- Option 2: Add points rewards to reach 5000 (more realistic)
-- First, clear existing points for the user
-- DELETE FROM points_rewards WHERE user_id = 'USER_ID_HERE';
-- UPDATE profiles SET total_points = 0 WHERE id = 'USER_ID_HERE';

-- Then add points to reach exactly 5000
-- For example, add 20 base hits (200 points each) = 4000 points
-- Then add 20 speed bonuses (50 points each) = 1000 points
-- Total: 5000 points

-- Example: Add 20 base hits (200 points each)
-- INSERT INTO points_rewards (user_id, points, reward_type, source_type, description)
-- SELECT 
--   'USER_ID_HERE'::uuid,
--   200,
--   'base_hit',
--   'test',
--   'Test base hit reward'
-- FROM generate_series(1, 20);

-- Example: Add 20 speed bonuses (50 points each)
-- INSERT INTO points_rewards (user_id, points, reward_type, source_type, description)
-- SELECT 
--   'USER_ID_HERE'::uuid,
--   50,
--   'speed_bonus',
--   'test',
--   'Test speed bonus reward'
-- FROM generate_series(1, 20);

-- The trigger will automatically update total_points in profiles

-- Verify the points
-- SELECT 
--   p.id,
--   p.name,
--   p.total_points,
--   (SELECT SUM(points) FROM points_rewards WHERE user_id = p.id) as calculated_points
-- FROM profiles p
-- WHERE p.id = 'USER_ID_HERE';

-- To test the reward request creation, you can manually create one:
-- INSERT INTO reward_requests (user_id, points_used, reward_amount, status, request_type, notes)
-- VALUES (
--   'USER_ID_HERE'::uuid,
--   5000,
--   500.00,
--   'pending',
--   'full_participation',
--   'Test reward request for 5000 points'
-- );
