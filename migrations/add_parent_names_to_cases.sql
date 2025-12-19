-- Add parent name fields to cases table for manual entry
ALTER TABLE cases 
ADD COLUMN IF NOT EXISTS first_parent_name TEXT,
ADD COLUMN IF NOT EXISTS second_parent_name TEXT;

-- Add comments
COMMENT ON COLUMN cases.first_parent_name IS 'Manually entered name for first parent (if not linked to existing profile)';
COMMENT ON COLUMN cases.second_parent_name IS 'Manually entered name for second parent (if not linked to existing profile)';


