-- Create surrogate_medical_info table for storing IVF clinic, OB/GYN doctor, and delivery hospital information
-- This table stores medical facility and provider information for surrogates

CREATE TABLE IF NOT EXISTS surrogate_medical_info (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- IVF Clinic Information
  ivf_clinic_name TEXT,
  ivf_clinic_address TEXT,
  ivf_clinic_phone TEXT,
  ivf_clinic_email TEXT,
  ivf_clinic_doctor_name TEXT,
  
  -- OB/GYN Doctor Information
  obgyn_doctor_name TEXT,
  obgyn_clinic_name TEXT,
  obgyn_clinic_address TEXT,
  obgyn_clinic_phone TEXT,
  obgyn_clinic_email TEXT,
  
  -- Delivery Hospital Information
  delivery_hospital_name TEXT,
  delivery_hospital_address TEXT,
  delivery_hospital_phone TEXT,
  delivery_hospital_email TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  
  -- Ensure one record per user
  UNIQUE(user_id)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_surrogate_medical_info_user_id ON surrogate_medical_info(user_id);

-- Enable Row Level Security
ALTER TABLE surrogate_medical_info ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own medical info
CREATE POLICY "Users can view their own medical info"
  ON surrogate_medical_info
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own medical info
CREATE POLICY "Users can insert their own medical info"
  ON surrogate_medical_info
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own medical info
CREATE POLICY "Users can update their own medical info"
  ON surrogate_medical_info
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: Users can delete their own medical info
CREATE POLICY "Users can delete their own medical info"
  ON surrogate_medical_info
  FOR DELETE
  USING (auth.uid() = user_id);

-- Policy: Parents can view matched surrogate's medical info
CREATE POLICY "Parents can view matched surrogate's medical info"
  ON surrogate_medical_info
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM surrogate_matches
      WHERE surrogate_matches.parent_id = auth.uid()
        AND surrogate_matches.surrogate_id = surrogate_medical_info.user_id
        AND surrogate_matches.status = 'active'
    )
  );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_surrogate_medical_info_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER trigger_update_surrogate_medical_info_updated_at
  BEFORE UPDATE ON surrogate_medical_info
  FOR EACH ROW
  EXECUTE FUNCTION update_surrogate_medical_info_updated_at();

-- Add comments for documentation
COMMENT ON TABLE surrogate_medical_info IS 'Stores IVF clinic, OB/GYN doctor, and delivery hospital information for surrogates';
COMMENT ON COLUMN surrogate_medical_info.ivf_clinic_name IS 'Name of the IVF clinic';
COMMENT ON COLUMN surrogate_medical_info.obgyn_doctor_name IS 'Name of the OB/GYN doctor';
COMMENT ON COLUMN surrogate_medical_info.delivery_hospital_name IS 'Name of the delivery hospital';

