-- Fix RLS policy for medical_reports
-- Allow parents with 'matched' OR 'active' status to view surrogate's medical reports
-- Run this in Supabase SQL Editor

DROP POLICY IF EXISTS "Parents can view matched surrogate's medical reports" ON medical_reports;
CREATE POLICY "Parents can view matched surrogate's medical reports"
  ON medical_reports
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM surrogate_matches
      WHERE surrogate_matches.parent_id = auth.uid()
        AND surrogate_matches.surrogate_id = medical_reports.user_id
        AND surrogate_matches.status IN ('active', 'matched')
    )
  );
