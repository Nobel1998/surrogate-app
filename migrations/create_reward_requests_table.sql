-- Create reward_requests table for tracking reward redemption requests
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS reward_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  points_used INTEGER NOT NULL DEFAULT 0,
  reward_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00, -- Amount in USD
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'paid')),
  request_type TEXT NOT NULL DEFAULT 'full_participation' CHECK (request_type IN ('full_participation', 'partial', 'custom')),
  notes TEXT,
  admin_notes TEXT,
  processed_by UUID REFERENCES auth.users(id),
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_reward_requests_user_id ON reward_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_reward_requests_status ON reward_requests(status);
CREATE INDEX IF NOT EXISTS idx_reward_requests_created_at ON reward_requests(created_at DESC);

-- Enable RLS (Row Level Security)
ALTER TABLE reward_requests ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own requests
CREATE POLICY "Users can view their own reward requests"
  ON reward_requests
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own requests
CREATE POLICY "Users can insert their own reward requests"
  ON reward_requests
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Service role can do everything (for admin dashboard)
CREATE POLICY "Service role can manage reward requests"
  ON reward_requests
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Add comments for documentation
COMMENT ON TABLE reward_requests IS 'Tracks reward redemption requests from users';
COMMENT ON COLUMN reward_requests.points_used IS 'Number of points used for this reward request';
COMMENT ON COLUMN reward_requests.reward_amount IS 'Dollar amount of the reward (points_used / 10)';
COMMENT ON COLUMN reward_requests.status IS 'Request status: pending, approved, rejected, or paid';
COMMENT ON COLUMN reward_requests.request_type IS 'Type of reward request: full_participation (5000 points), partial, or custom';
