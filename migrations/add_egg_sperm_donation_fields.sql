-- Add egg_donation and sperm_donation fields to surrogate_matches table
-- Also rename company column to escrow for clarity

DO $$
BEGIN
  -- Add egg_donation field if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'surrogate_matches' 
    AND column_name = 'egg_donation'
  ) THEN
    ALTER TABLE surrogate_matches
      ADD COLUMN egg_donation TEXT;
    
    RAISE NOTICE 'Added egg_donation column to surrogate_matches table';
  ELSE
    RAISE NOTICE 'egg_donation column already exists in surrogate_matches table';
  END IF;

  -- Add sperm_donation field if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'surrogate_matches' 
    AND column_name = 'sperm_donation'
  ) THEN
    ALTER TABLE surrogate_matches
      ADD COLUMN sperm_donation TEXT;
    
    RAISE NOTICE 'Added sperm_donation column to surrogate_matches table';
  ELSE
    RAISE NOTICE 'sperm_donation column already exists in surrogate_matches table';
  END IF;

  -- Note: We keep the company column as is for backward compatibility
  -- The frontend will display it as "escrow" but the database column remains "company"
END $$;
