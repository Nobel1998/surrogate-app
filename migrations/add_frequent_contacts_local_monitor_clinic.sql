-- Add Local Monitor Clinic category to frequent_contacts
-- Run in Supabase SQL Editor

ALTER TABLE frequent_contacts
  DROP CONSTRAINT IF EXISTS frequent_contacts_category_check;

ALTER TABLE frequent_contacts
  ADD CONSTRAINT frequent_contacts_category_check
  CHECK (category IN (
    'ivf_clinic',
    'local_monitor_clinic',
    'attorney_escrow',
    'insurance_broker',
    'therapist',
    'ob_office',
    'retreat'
  ));

COMMENT ON COLUMN frequent_contacts.category IS
  'ivf_clinic | local_monitor_clinic | attorney_escrow | insurance_broker | therapist | ob_office | retreat';
