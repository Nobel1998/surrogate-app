-- Clear all points rewards and reset user total_points
-- Run this in Supabase SQL Editor

-- Delete all points rewards records
DELETE FROM points_rewards;

-- Reset all user total_points to 0
UPDATE profiles SET total_points = 0 WHERE total_points IS NOT NULL;

-- Verify the cleanup
SELECT 
  COUNT(*) as remaining_points_records,
  SUM(total_points) as total_points_sum
FROM profiles;
