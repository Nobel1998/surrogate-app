-- Add surrogate_bmi column to surrogate_matches table
-- This allows administrators to input and store surrogate BMI directly in matches

ALTER TABLE surrogate_matches
  ADD COLUMN IF NOT EXISTS surrogate_bmi DECIMAL(5, 2);

-- Add comment for documentation
COMMENT ON COLUMN surrogate_matches.surrogate_bmi IS 'BMI (Body Mass Index) of the surrogate, can be entered by administrators';
