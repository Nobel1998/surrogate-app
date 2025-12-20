-- Rename foreign key constraint from case_managers_manager_id_fkey to match_managers_manager_id_fkey
-- This is needed because the table was renamed from case_managers to match_managers,
-- but the foreign key constraint name was not automatically updated

DO $$
BEGIN
  -- Check if the old constraint exists and rename it
  IF EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE constraint_schema = 'public' 
      AND constraint_name = 'case_managers_manager_id_fkey'
      AND table_name = 'match_managers'
  ) THEN
    ALTER TABLE match_managers 
      RENAME CONSTRAINT case_managers_manager_id_fkey TO match_managers_manager_id_fkey;
    
    RAISE NOTICE 'Renamed foreign key constraint from case_managers_manager_id_fkey to match_managers_manager_id_fkey';
  ELSE
    RAISE NOTICE 'Foreign key constraint case_managers_manager_id_fkey does not exist, skipping rename';
  END IF;
END $$;
