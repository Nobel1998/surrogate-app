-- Opening/closing paragraphs written by the AI reviewer
-- Run this in Supabase SQL Editor

ALTER TABLE medical_record_reviews
  ADD COLUMN IF NOT EXISTS intro TEXT,
  ADD COLUMN IF NOT EXISTS conclusion TEXT;

COMMENT ON COLUMN medical_record_reviews.intro IS
  'AI-written opening paragraph: who the patient is and that the records were reviewed';
COMMENT ON COLUMN medical_record_reviews.conclusion IS
  'AI-written closing paragraph: overall assessment across the reported complications';
