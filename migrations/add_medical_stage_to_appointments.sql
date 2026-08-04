-- Store medical check-in stage on appointments so Pre-Transfer / Post-Transfer / OBGYN
-- slots are not merged across stages (same date+time is not enough).

ALTER TABLE public.ivf_appointments
  ADD COLUMN IF NOT EXISTS medical_stage TEXT;

ALTER TABLE public.ob_appointments
  ADD COLUMN IF NOT EXISTS medical_stage TEXT;

COMMENT ON COLUMN public.ivf_appointments.medical_stage IS
  'Medical check-in stage: Pre-Transfer | Post-Transfer | OBGYN';
COMMENT ON COLUMN public.ob_appointments.medical_stage IS
  'Medical check-in stage: Pre-Transfer | Post-Transfer | OBGYN';
