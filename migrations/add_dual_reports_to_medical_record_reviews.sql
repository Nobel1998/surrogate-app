-- Dual reports for Medical Record Reviews (clinic + internal staff)
-- Run in Supabase SQL Editor

ALTER TABLE medical_record_reviews
  ADD COLUMN IF NOT EXISTS clinic_report TEXT,
  ADD COLUMN IF NOT EXISTS staff_report TEXT,
  ADD COLUMN IF NOT EXISTS complexity_tier INTEGER
    CHECK (complexity_tier IS NULL OR complexity_tier IN (1, 2, 3));

COMMENT ON COLUMN medical_record_reviews.clinic_report IS
  'Clinic-ready non-clinical factual summary (Markdown). Safe to share with fertility clinics.';
COMMENT ON COLUMN medical_record_reviews.staff_report IS
  'Internal Babytree staff reference summary with Case Complexity Flag (Markdown). Do not share externally.';
COMMENT ON COLUMN medical_record_reviews.complexity_tier IS
  'Staff report Case Complexity Flag: 1=standard workflow, 2=routine physician review, 3=specialist/MFM before matching';
