-- Allow authenticated surrogates to upload claim files to documents/online_claim_submissions/{user_id}/
-- Run after create_online_claim_submissions_table.sql. Requires bucket "documents" to exist.

-- Policy: authenticated users can upload to their own folder under online_claim_submissions
DROP POLICY IF EXISTS "Users can upload own online claim submission files" ON storage.objects;
CREATE POLICY "Users can upload own online claim submission files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] = 'online_claim_submissions'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

-- Allow users to read their own uploaded files
DROP POLICY IF EXISTS "Users can read own online claim submission files" ON storage.objects;
CREATE POLICY "Users can read own online claim submission files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] = 'online_claim_submissions'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );
