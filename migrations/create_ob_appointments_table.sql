-- Create ob_appointments table for storing OB appointment bookings
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS ob_appointments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  match_id UUID REFERENCES surrogate_matches(id) ON DELETE SET NULL,
  appointment_date DATE NOT NULL,
  appointment_time TIME NOT NULL,
  provider_name TEXT,
  clinic_name TEXT,
  clinic_address TEXT,
  clinic_phone TEXT,
  appointment_type TEXT CHECK (appointment_type IN ('routine', 'ultrasound', 'lab_work', 'consultation', 'other')),
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'rescheduled')),
  reminder_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_ob_appointments_user_id ON ob_appointments(user_id);
CREATE INDEX IF NOT EXISTS idx_ob_appointments_match_id ON ob_appointments(match_id);
CREATE INDEX IF NOT EXISTS idx_ob_appointments_appointment_date ON ob_appointments(appointment_date DESC);
CREATE INDEX IF NOT EXISTS idx_ob_appointments_status ON ob_appointments(status);

-- Enable Row Level Security
ALTER TABLE ob_appointments ENABLE ROW LEVEL SECURITY;

-- Policy: Surrogates can view and manage their own appointments
CREATE POLICY "Surrogates can view their own appointments"
  ON ob_appointments
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Surrogates can insert their own appointments"
  ON ob_appointments
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Surrogates can update their own appointments"
  ON ob_appointments
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Surrogates can delete their own appointments"
  ON ob_appointments
  FOR DELETE
  USING (auth.uid() = user_id);

-- Policy: Parents can view matched surrogate's appointments
CREATE POLICY "Parents can view matched surrogate's appointments"
  ON ob_appointments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM surrogate_matches
      WHERE surrogate_matches.parent_id = auth.uid()
        AND surrogate_matches.surrogate_id = ob_appointments.user_id
        AND surrogate_matches.status = 'active'
    )
  );

-- Policy: Admins can view all appointments (via service role)
-- Note: Service role bypasses RLS, so admins can access via API

-- Add comments for documentation
COMMENT ON TABLE ob_appointments IS 'Stores OB/GYN appointment bookings made by surrogates';
COMMENT ON COLUMN ob_appointments.appointment_type IS 'Type of appointment: routine, ultrasound, lab_work, consultation, other';
COMMENT ON COLUMN ob_appointments.status IS 'Appointment status: scheduled, completed, cancelled, rescheduled';
COMMENT ON COLUMN ob_appointments.reminder_sent IS 'Whether a reminder notification has been sent for this appointment';

