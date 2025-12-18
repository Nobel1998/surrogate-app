-- Create points_rewards table for tracking user points/credits
CREATE TABLE IF NOT EXISTS points_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  points INTEGER NOT NULL DEFAULT 0,
  reward_type TEXT NOT NULL, -- 'base_hit', 'speed_bonus', etc.
  source_type TEXT NOT NULL, -- 'medical_report', 'referral', etc.
  source_id UUID, -- ID of the source record (e.g., medical_report.id)
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Drop constraint if exists, then add it
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'points_rewards_user_id_fkey'
  ) THEN
    ALTER TABLE points_rewards DROP CONSTRAINT points_rewards_user_id_fkey;
  END IF;
END $$;

ALTER TABLE points_rewards 
ADD CONSTRAINT points_rewards_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create index for faster queries (drop and recreate if exists)
DROP INDEX IF EXISTS idx_points_rewards_user_id;
CREATE INDEX idx_points_rewards_user_id ON points_rewards(user_id);

DROP INDEX IF EXISTS idx_points_rewards_created_at;
CREATE INDEX idx_points_rewards_created_at ON points_rewards(created_at DESC);

DROP INDEX IF EXISTS idx_points_rewards_source;
CREATE INDEX idx_points_rewards_source ON points_rewards(source_type, source_id);

-- Enable RLS (Row Level Security)
ALTER TABLE points_rewards ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own points
CREATE POLICY "Users can view their own points"
  ON points_rewards
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: System can insert points (via service role)
CREATE POLICY "Service role can insert points"
  ON points_rewards
  FOR INSERT
  WITH CHECK (true);

-- Add total_points column to profiles table for quick access
-- (This will be calculated from points_rewards, but cached for performance)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_points INTEGER DEFAULT 0;

-- Create a function to update total_points in profiles
CREATE OR REPLACE FUNCTION update_user_total_points()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles
  SET total_points = (
    SELECT COALESCE(SUM(points), 0)
    FROM points_rewards
    WHERE user_id = NEW.user_id
  )
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS update_total_points_trigger ON points_rewards;

-- Create trigger to update total_points when points are added
CREATE TRIGGER update_total_points_trigger
  AFTER INSERT ON points_rewards
  FOR EACH ROW
  EXECUTE FUNCTION update_user_total_points();
