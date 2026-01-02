-- Remove appointment_type column from ob_appointments table
-- All appointments are OB appointments, so this field is not needed
-- Run this in Supabase SQL Editor

-- Drop the CHECK constraint on appointment_type first
ALTER TABLE ob_appointments
  DROP CONSTRAINT IF EXISTS ob_appointments_appointment_type_check;

-- Remove the appointment_type column
ALTER TABLE ob_appointments
  DROP COLUMN IF EXISTS appointment_type;

