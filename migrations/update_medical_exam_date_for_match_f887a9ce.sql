-- Update medical exam date for MATCH-F887A9CE to 2025-12-17
-- This updates the Pre-Transfer medical report visit_date for the surrogate in this match

-- First, find the surrogate_id for MATCH-F887A9CE
-- Then update the Pre-Transfer medical report visit_date to 2025-12-17

UPDATE medical_reports
SET visit_date = '2025-12-17',
    updated_at = NOW()
WHERE user_id IN (
  SELECT surrogate_id 
  FROM surrogate_matches 
  WHERE claim_id = 'MATCH-F887A9CE'
)
AND stage = 'Pre-Transfer'
AND visit_date IS NOT NULL;

-- Add comment
COMMENT ON TABLE medical_reports IS 'Stores medical check-in reports for different stages of surrogacy journey. Updated visit_date for MATCH-F887A9CE Pre-Transfer report to 2025-12-17.';
