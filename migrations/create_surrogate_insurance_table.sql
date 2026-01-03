-- Create surrogate_insurance table for storing insurance information
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS surrogate_insurance (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  match_id UUID REFERENCES surrogate_matches(id) ON DELETE SET NULL,
  insurance_company TEXT NOT NULL,
  premium DECIMAL(10, 2),
  active_date DATE NOT NULL,
  agent TEXT,
  purchased_by TEXT NOT NULL CHECK (purchased_by IN ('agency', 'own', 'employer')),
  policy_number TEXT,
  date_of_birth DATE,
  zip_code TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_surrogate_insurance_user_id ON surrogate_insurance(user_id);
CREATE INDEX IF NOT EXISTS idx_surrogate_insurance_match_id ON surrogate_insurance(match_id);
CREATE INDEX IF NOT EXISTS idx_surrogate_insurance_active_date ON surrogate_insurance(active_date DESC);

-- Enable Row Level Security
ALTER TABLE surrogate_insurance ENABLE ROW LEVEL SECURITY;

-- Policy: Only service role (admins) can access insurance data
-- Regular users cannot access this table directly
-- Note: Service role bypasses RLS, so admins can access via API

-- Add comments for documentation
COMMENT ON TABLE surrogate_insurance IS 'Stores insurance information for surrogates (admin only)';
COMMENT ON COLUMN surrogate_insurance.purchased_by IS 'Who purchased the insurance: agency, own, or employer';
COMMENT ON COLUMN surrogate_insurance.premium IS 'Monthly or annual premium amount';

