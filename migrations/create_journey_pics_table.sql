-- Create journey_pics table for storing journey photos
CREATE TABLE IF NOT EXISTS journey_pics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES surrogate_matches(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  file_name TEXT,
  title TEXT,
  description TEXT,
  photo_date DATE,
  uploaded_by UUID REFERENCES admin_users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_journey_pics_match_id ON journey_pics(match_id);
CREATE INDEX IF NOT EXISTS idx_journey_pics_photo_date ON journey_pics(photo_date);

-- Enable RLS
ALTER TABLE journey_pics ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Only service role (admins) can access journey_pics
DROP POLICY IF EXISTS "Service role can manage journey_pics" ON journey_pics;
CREATE POLICY "Service role can manage journey_pics"
  ON journey_pics
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Add comment
COMMENT ON TABLE journey_pics IS 'Stores journey photos uploaded by admins or case managers for matches';

