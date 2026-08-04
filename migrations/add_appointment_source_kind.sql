-- Allow one medical report to create both a completed visit appointment
-- and a scheduled next-check appointment.
ALTER TABLE public.ob_appointments
  ADD COLUMN IF NOT EXISTS source_kind TEXT;

ALTER TABLE public.ivf_appointments
  ADD COLUMN IF NOT EXISTS source_kind TEXT;

UPDATE public.ob_appointments
SET source_kind = 'next'
WHERE source_medical_report_id IS NOT NULL
  AND (source_kind IS NULL OR source_kind = '');

UPDATE public.ivf_appointments
SET source_kind = 'next'
WHERE source_medical_report_id IS NOT NULL
  AND (source_kind IS NULL OR source_kind = '');

ALTER TABLE public.ob_appointments
  ALTER COLUMN source_kind SET DEFAULT 'next';

ALTER TABLE public.ivf_appointments
  ALTER COLUMN source_kind SET DEFAULT 'next';

DROP INDEX IF EXISTS idx_ob_appointments_source_medical_report_id;
DROP INDEX IF EXISTS idx_ivf_appointments_source_medical_report_id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_ob_appointments_source_report_kind
  ON public.ob_appointments (source_medical_report_id, source_kind)
  WHERE source_medical_report_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_ivf_appointments_source_report_kind
  ON public.ivf_appointments (source_medical_report_id, source_kind)
  WHERE source_medical_report_id IS NOT NULL;

COMMENT ON COLUMN public.ob_appointments.source_kind IS
  'visit = completed check-in visit; next = upcoming appointment from next check fields';
COMMENT ON COLUMN public.ivf_appointments.source_kind IS
  'visit = completed check-in visit; next = upcoming appointment from next check fields';
