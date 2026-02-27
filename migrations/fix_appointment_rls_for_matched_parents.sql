-- Fix RLS policies for ob_appointments and ivf_appointments
-- Allow parents with 'matched' OR 'active' status to view surrogate's appointments
-- Run this in Supabase SQL Editor

-- Fix OB appointments
DROP POLICY IF EXISTS "Parents can view matched surrogate's appointments" ON ob_appointments;
CREATE POLICY "Parents can view matched surrogate's appointments"
  ON ob_appointments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM surrogate_matches
      WHERE surrogate_matches.parent_id = auth.uid()
        AND surrogate_matches.surrogate_id = ob_appointments.user_id
        AND surrogate_matches.status IN ('active', 'matched')
    )
  );

-- Fix IVF appointments
DROP POLICY IF EXISTS "Parents can view matched surrogate's IVF appointments" ON ivf_appointments;
CREATE POLICY "Parents can view matched surrogate's IVF appointments"
  ON ivf_appointments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM surrogate_matches
      WHERE surrogate_matches.parent_id = auth.uid()
        AND surrogate_matches.surrogate_id = ivf_appointments.user_id
        AND surrogate_matches.status IN ('active', 'matched')
    )
  );
