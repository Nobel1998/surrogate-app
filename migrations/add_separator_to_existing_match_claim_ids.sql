-- Update existing match claim_ids to add '--' separator between surrogate and parent names
-- This migration updates all existing matches that don't already have the '--' separator
-- Handles duplicates by adding numeric suffix when needed

DO $$
DECLARE
  match_record RECORD;
  base_claim_id TEXT;
  final_claim_id TEXT;
  counter INTEGER;
  surrogate_first_name TEXT;
  parent_first_name TEXT;
BEGIN
  -- Loop through all matches that need updating
  FOR match_record IN 
    SELECT sm.id, sm.surrogate_id, sm.parent_id, sm.claim_id
    FROM surrogate_matches sm
    WHERE sm.surrogate_id IS NOT NULL 
      AND sm.parent_id IS NOT NULL
      -- Only update matches that don't already have the '--' separator
      AND (sm.claim_id IS NULL OR sm.claim_id NOT LIKE '%--%')
    ORDER BY sm.created_at ASC
  LOOP
    -- Extract first names
    SELECT SPLIT_PART(p_surrogate.name, ' ', 1) 
    INTO surrogate_first_name
    FROM profiles p_surrogate 
    WHERE p_surrogate.id = match_record.surrogate_id;
    
    SELECT SPLIT_PART(p_parent.name, ' ', 1) 
    INTO parent_first_name
    FROM profiles p_parent 
    WHERE p_parent.id = match_record.parent_id;
    
    -- Generate base claim_id with '--' separator
    base_claim_id := COALESCE(surrogate_first_name, 'Surrogate') || '--' || COALESCE(parent_first_name, 'Parent');
    
    -- Check if this claim_id already exists
    final_claim_id := base_claim_id;
    counter := 1;
    
    -- If claim_id exists, add numeric suffix
    WHILE EXISTS (
      SELECT 1 FROM surrogate_matches 
      WHERE claim_id = final_claim_id 
        AND id != match_record.id
    ) LOOP
      counter := counter + 1;
      final_claim_id := base_claim_id || counter::TEXT;
    END LOOP;
    
    -- Update the match with the final claim_id
    UPDATE surrogate_matches
    SET claim_id = final_claim_id
    WHERE id = match_record.id;
    
  END LOOP;
END $$;

-- Add comment for documentation
COMMENT ON COLUMN surrogate_matches.claim_id IS 'Match identifier: surrogate firstname--parent firstname (e.g., Alice--Bob). If duplicate, numeric suffix is added (e.g., Alice--Bob2)';
