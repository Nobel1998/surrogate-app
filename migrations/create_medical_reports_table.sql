-- Create medical_reports table for storing medical check-in reports
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS medical_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  visit_date DATE NOT NULL,
  provider_name TEXT,
  stage TEXT NOT NULL CHECK (stage IN ('Pre-Transfer', 'Post-Transfer', 'OBGYN')),
  report_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  proof_image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_medical_reports_user_id ON medical_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_medical_reports_stage ON medical_reports(stage);
CREATE INDEX IF NOT EXISTS idx_medical_reports_visit_date ON medical_reports(visit_date DESC);

-- Enable Row Level Security
ALTER TABLE medical_reports ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own reports
CREATE POLICY "Users can view their own medical reports"
  ON medical_reports
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own reports
CREATE POLICY "Users can insert their own medical reports"
  ON medical_reports
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own reports
CREATE POLICY "Users can update their own medical reports"
  ON medical_reports
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: Users can delete their own reports
CREATE POLICY "Users can delete their own medical reports"
  ON medical_reports
  FOR DELETE
  USING (auth.uid() = user_id);

-- Policy: Parents can view matched surrogate's reports
CREATE POLICY "Parents can view matched surrogate's medical reports"
  ON medical_reports
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM surrogate_matches
      WHERE surrogate_matches.parent_id = auth.uid()
        AND surrogate_matches.surrogate_id = medical_reports.user_id
        AND surrogate_matches.status = 'active'
    )
  );

-- Add comments for documentation
COMMENT ON TABLE medical_reports IS 'Stores medical check-in reports for different stages of surrogacy journey';
COMMENT ON COLUMN medical_reports.stage IS 'Stage of the journey: Pre-Transfer, Post-Transfer, or OBGYN';
COMMENT ON COLUMN medical_reports.report_data IS 'JSONB field storing stage-specific medical data (estradiol, beta_hcg, weight, etc.)';
COMMENT ON COLUMN medical_reports.proof_image_url IS 'URL to uploaded clinic note or ultrasound image';

