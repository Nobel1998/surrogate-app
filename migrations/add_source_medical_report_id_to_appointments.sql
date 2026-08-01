-- Link OB/IVF appointments created from medical check-in "next check" fields.
-- Allows upsert/update when the same medical report is edited.

ALTER TABLE ob_appointments
  ADD COLUMN IF NOT EXISTS source_medical_report_id UUID REFERENCES medical_reports(id) ON DELETE CASCADE;

ALTER TABLE ivf_appointments
  ADD COLUMN IF NOT EXISTS source_medical_report_id UUID REFERENCES medical_reports(id) ON DELETE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS idx_ob_appointments_source_medical_report_id
  ON ob_appointments(source_medical_report_id)
  WHERE source_medical_report_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_ivf_appointments_source_medical_report_id
  ON ivf_appointments(source_medical_report_id)
  WHERE source_medical_report_id IS NOT NULL;

COMMENT ON COLUMN ob_appointments.source_medical_report_id IS
  'Medical report that created this appointment (OBGYN next check)';
COMMENT ON COLUMN ivf_appointments.source_medical_report_id IS
  'Medical report that created this appointment (Pre/Post-Transfer next check)';
