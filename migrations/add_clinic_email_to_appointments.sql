-- Allow appointments to store clinic email separately from phone
-- (medical provider contact may be phone and/or email).

ALTER TABLE public.ivf_appointments
  ADD COLUMN IF NOT EXISTS clinic_email TEXT;

ALTER TABLE public.ob_appointments
  ADD COLUMN IF NOT EXISTS clinic_email TEXT;

COMMENT ON COLUMN public.ivf_appointments.clinic_email IS 'Clinic / provider email (phone stays in clinic_phone)';
COMMENT ON COLUMN public.ob_appointments.clinic_email IS 'Clinic / provider email (phone stays in clinic_phone)';
