-- Global documents (e.g. Benefit Package PDF) visible to all authenticated app users.
-- Admins upload via backend; app fetches file_url for display.

CREATE TABLE IF NOT EXISTS public.global_documents (
  document_type TEXT PRIMARY KEY,
  file_url TEXT NOT NULL,
  file_name TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.global_documents ENABLE ROW LEVEL SECURITY;

-- Authenticated app users can read global documents (e.g. benefit_package PDF).
CREATE POLICY "Allow authenticated read global_documents"
  ON public.global_documents
  FOR SELECT
  TO authenticated
  USING (true);

-- Service role / backend can insert/update (no policy needed; service role bypasses RLS).
COMMENT ON TABLE public.global_documents IS 'Global documents (e.g. benefit_package PDF) uploaded by admin, readable by authenticated users.';
