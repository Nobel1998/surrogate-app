-- Allow removing PDF blobs after review while keeping complication findings.
-- Run in Supabase SQL Editor after create_medical_record_reviews_table.sql

ALTER TABLE medical_record_reviews
  ADD COLUMN IF NOT EXISTS file_deleted_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE medical_record_reviews
  ALTER COLUMN file_url DROP NOT NULL;

ALTER TABLE medical_record_reviews
  ALTER COLUMN storage_path DROP NOT NULL;

COMMENT ON COLUMN medical_record_reviews.file_deleted_at IS
  'Set when the uploaded PDF is removed from storage after review to save space';
