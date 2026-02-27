-- Add uploaded_by column to track who uploaded the medical check-in
-- Run this in Supabase SQL Editor

ALTER TABLE medical_reports
ADD COLUMN IF NOT EXISTS uploaded_by TEXT DEFAULT 'surrogate';

COMMENT ON COLUMN medical_reports.uploaded_by IS 'Who uploaded this check-in: surrogate or admin';
