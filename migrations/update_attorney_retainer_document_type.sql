-- Update existing attorney retainer documents from 'legal_contract' to 'attorney_retainer'
-- This migration updates documents that were uploaded via attorney-retainer API
-- (identified by file_url containing 'attorney-retainer' path)

UPDATE documents
SET document_type = 'attorney_retainer'
WHERE document_type = 'legal_contract'
  AND file_url LIKE '%/attorney-retainer/%';

-- Add comment
COMMENT ON COLUMN documents.document_type IS 'Document type: parent_contract, surrogate_contract, agency_retainer, trust_account, attorney_retainer, legal_contract, insurance_policy, health_insurance_bill, parental_rights, hipaa_release, photo_release, online_claims';

