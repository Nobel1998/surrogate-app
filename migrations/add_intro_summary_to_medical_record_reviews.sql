-- Opening/closing paragraphs written by the AI reviewer
-- Run this in Supabase SQL Editor

ALTER TABLE medical_record_reviews
  ADD COLUMN IF NOT EXISTS intro TEXT,
  ADD COLUMN IF NOT EXISTS summary TEXT;

COMMENT ON COLUMN medical_record_reviews.intro IS
  'AI-written introductory paragraph: who the patient is and that the records were reviewed';
COMMENT ON COLUMN medical_record_reviews.summary IS
  'AI-written overall summary of the reported complications (not an assessment or recommendation)';
