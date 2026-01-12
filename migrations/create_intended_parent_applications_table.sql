-- Create intended_parent_applications table for storing intended parent application forms
-- This table stores comprehensive application data from intended parents

CREATE TABLE IF NOT EXISTS intended_parent_applications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  form_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'approved', 'rejected', 'in_progress')),
  submitted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_intended_parent_applications_user_id ON intended_parent_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_intended_parent_applications_status ON intended_parent_applications(status);
CREATE INDEX IF NOT EXISTS idx_intended_parent_applications_submitted_at ON intended_parent_applications(submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_intended_parent_applications_created_at ON intended_parent_applications(created_at DESC);

-- Enable Row Level Security
ALTER TABLE intended_parent_applications ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own applications
CREATE POLICY "Users can view their own intended parent applications"
  ON intended_parent_applications
  FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() IS NULL);

-- Policy: Users can insert their own applications
CREATE POLICY "Users can insert their own intended parent applications"
  ON intended_parent_applications
  FOR INSERT
  WITH CHECK (auth.uid() = user_id OR auth.uid() IS NULL);

-- Policy: Users can update their own applications
CREATE POLICY "Users can update their own intended parent applications"
  ON intended_parent_applications
  FOR UPDATE
  USING (auth.uid() = user_id OR auth.uid() IS NULL)
  WITH CHECK (auth.uid() = user_id OR auth.uid() IS NULL);

-- Add comments for documentation
COMMENT ON TABLE intended_parent_applications IS 'Stores application forms submitted by intended parents';
COMMENT ON COLUMN intended_parent_applications.form_data IS 'JSONB field containing all form data from the 9-step application process';
COMMENT ON COLUMN intended_parent_applications.status IS 'Application status: pending, under_review, approved, rejected, or in_progress';
