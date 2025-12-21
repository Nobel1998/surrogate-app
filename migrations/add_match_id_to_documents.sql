-- Add match_id column to documents table to support admin-uploaded files visible to both surrogate and parent
-- This allows administrators to upload a single file that is visible to both parties in a match

DO $$
BEGIN
  -- Add match_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'documents' 
    AND column_name = 'match_id'
  ) THEN
    ALTER TABLE documents
      ADD COLUMN match_id UUID REFERENCES surrogate_matches(id) ON DELETE CASCADE;
    
    -- Create index for faster queries
    CREATE INDEX IF NOT EXISTS idx_documents_match_id ON documents(match_id);
    
    RAISE NOTICE 'Added match_id column to documents table';
  ELSE
    RAISE NOTICE 'match_id column already exists in documents table';
  END IF;
END $$;
