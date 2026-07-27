-- Medical record PDF reviews (admin-only AI complication extraction)
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS medical_record_reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT,
  file_url TEXT,
  file_name TEXT,
  storage_path TEXT,
  surrogate_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  match_id UUID REFERENCES surrogate_matches(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'uploaded'
    CHECK (status IN ('uploaded', 'analyzing', 'analyzed', 'failed', 'reviewed')),
  complications JSONB NOT NULL DEFAULT '[]'::jsonb,
  raw_ai_response TEXT,
  error_message TEXT,
  analyzed_at TIMESTAMP WITH TIME ZONE,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID,
  created_by UUID,
  file_deleted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_medical_record_reviews_status
  ON medical_record_reviews(status);
CREATE INDEX IF NOT EXISTS idx_medical_record_reviews_created_at
  ON medical_record_reviews(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_medical_record_reviews_surrogate_user_id
  ON medical_record_reviews(surrogate_user_id);
CREATE INDEX IF NOT EXISTS idx_medical_record_reviews_match_id
  ON medical_record_reviews(match_id);

ALTER TABLE medical_record_reviews ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE medical_record_reviews IS
  'Admin-uploaded medical record PDFs reviewed for complications + page numbers; PDF may be purged after review';
COMMENT ON COLUMN medical_record_reviews.complications IS
  'JSON array: [{ "complication": string, "page": number, "note"?: string }]';
COMMENT ON COLUMN medical_record_reviews.storage_path IS
  'Path inside documents bucket, e.g. medical-record-reviews/{id}/{filename}.pdf; null after purge';
COMMENT ON COLUMN medical_record_reviews.file_deleted_at IS
  'Set when the uploaded PDF is removed from storage after review to save space';
