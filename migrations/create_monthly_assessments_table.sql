-- Create monthly_assessments table for storing monthly assessment reports
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS monthly_assessments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  match_id UUID REFERENCES surrogate_matches(id) ON DELETE SET NULL,
  assessment_date DATE NOT NULL,
  assessor_name TEXT,
  report_url TEXT NOT NULL,
  file_name TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_monthly_assessments_user_id ON monthly_assessments(user_id);
CREATE INDEX IF NOT EXISTS idx_monthly_assessments_match_id ON monthly_assessments(match_id);
CREATE INDEX IF NOT EXISTS idx_monthly_assessments_assessment_date ON monthly_assessments(assessment_date DESC);

-- Enable Row Level Security
ALTER TABLE monthly_assessments ENABLE ROW LEVEL SECURITY;

-- Policy: Only service role (admins) can access monthly assessments
-- Regular users cannot access this table directly
-- Note: Service role bypasses RLS, so admins can access via API

-- Add comments for documentation
COMMENT ON TABLE monthly_assessments IS 'Stores monthly assessment reports for surrogates (admin only)';
COMMENT ON COLUMN monthly_assessments.report_url IS 'URL to the uploaded assessment report file';

