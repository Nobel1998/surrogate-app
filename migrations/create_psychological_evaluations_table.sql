-- Create psychological_evaluations table for storing psychological evaluation reports
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS psychological_evaluations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  match_id UUID REFERENCES surrogate_matches(id) ON DELETE SET NULL,
  evaluation_date DATE NOT NULL,
  evaluator_name TEXT,
  report_url TEXT NOT NULL,
  file_name TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_psychological_evaluations_user_id ON psychological_evaluations(user_id);
CREATE INDEX IF NOT EXISTS idx_psychological_evaluations_match_id ON psychological_evaluations(match_id);
CREATE INDEX IF NOT EXISTS idx_psychological_evaluations_evaluation_date ON psychological_evaluations(evaluation_date DESC);

-- Enable Row Level Security
ALTER TABLE psychological_evaluations ENABLE ROW LEVEL SECURITY;

-- Policy: Only service role (admins) can access psychological evaluations
-- Regular users cannot access this table directly
-- Note: Service role bypasses RLS, so admins can access via API

-- Add comments for documentation
COMMENT ON TABLE psychological_evaluations IS 'Stores psychological evaluation reports for surrogates (admin only)';
COMMENT ON COLUMN psychological_evaluations.report_url IS 'URL to the uploaded evaluation report file';

