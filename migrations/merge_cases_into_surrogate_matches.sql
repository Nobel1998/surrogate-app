-- Migration: Merge cases table into surrogate_matches table
-- This migration:
-- 1. Adds all case columns to surrogate_matches
-- 2. Migrates data from cases to surrogate_matches
-- 3. Updates case_managers to reference matches instead of cases
-- 4. Drops the cases table and related tables

-- Step 1: Add all case columns to surrogate_matches table
ALTER TABLE surrogate_matches
  -- Case identification
  ADD COLUMN IF NOT EXISTS claim_id TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS case_type TEXT CHECK (case_type IN ('Surrogacy', 'Egg Donation', 'Embryo Donation')),
  
  -- Parent information (cases has first_parent_id and second_parent_id, matches has parent_id)
  ADD COLUMN IF NOT EXISTS first_parent_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS second_parent_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS first_parent_name TEXT,
  ADD COLUMN IF NOT EXISTS second_parent_name TEXT,
  
  -- Manager assignment
  ADD COLUMN IF NOT EXISTS manager_id UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  
  -- Case progress
  ADD COLUMN IF NOT EXISTS current_step TEXT,
  
  -- Pregnancy information
  ADD COLUMN IF NOT EXISTS weeks_pregnant INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS estimated_due_date DATE,
  ADD COLUMN IF NOT EXISTS number_of_fetuses INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fetal_beat_confirm TEXT DEFAULT 'None',
  
  -- Important dates
  ADD COLUMN IF NOT EXISTS sign_date DATE,
  ADD COLUMN IF NOT EXISTS transfer_date DATE,
  ADD COLUMN IF NOT EXISTS beta_confirm_date DATE,
  ADD COLUMN IF NOT EXISTS due_date DATE,
  
  -- Clinic and medical information
  ADD COLUMN IF NOT EXISTS clinic TEXT,
  ADD COLUMN IF NOT EXISTS embryos TEXT,
  
  -- Legal and financial
  ADD COLUMN IF NOT EXISTS lawyer TEXT,
  ADD COLUMN IF NOT EXISTS company TEXT,
  
  -- File references (stored as JSONB for flexibility)
  ADD COLUMN IF NOT EXISTS files JSONB DEFAULT '{}'::jsonb;

-- Step 2: Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_surrogate_matches_claim_id ON surrogate_matches(claim_id);
CREATE INDEX IF NOT EXISTS idx_surrogate_matches_first_parent_id ON surrogate_matches(first_parent_id);
CREATE INDEX IF NOT EXISTS idx_surrogate_matches_second_parent_id ON surrogate_matches(second_parent_id);
CREATE INDEX IF NOT EXISTS idx_surrogate_matches_manager_id ON surrogate_matches(manager_id);
CREATE INDEX IF NOT EXISTS idx_surrogate_matches_case_type ON surrogate_matches(case_type);
CREATE INDEX IF NOT EXISTS idx_surrogate_matches_current_step ON surrogate_matches(current_step);

-- Step 3: Migrate data from cases to surrogate_matches
-- Match cases to surrogate_matches by surrogate_id and parent_id
UPDATE surrogate_matches sm
SET
  claim_id = c.claim_id,
  case_type = COALESCE(sm.case_type, c.case_type),
  first_parent_id = COALESCE(sm.first_parent_id, c.first_parent_id),
  second_parent_id = COALESCE(sm.second_parent_id, c.second_parent_id),
  first_parent_name = COALESCE(sm.first_parent_name, c.first_parent_name),
  second_parent_name = COALESCE(sm.second_parent_name, c.second_parent_name),
  manager_id = COALESCE(sm.manager_id, c.manager_id),
  branch_id = COALESCE(sm.branch_id, c.branch_id),
  current_step = COALESCE(sm.current_step, c.current_step),
  weeks_pregnant = COALESCE(sm.weeks_pregnant, c.weeks_pregnant),
  estimated_due_date = COALESCE(sm.estimated_due_date, c.estimated_due_date),
  number_of_fetuses = COALESCE(sm.number_of_fetuses, c.number_of_fetuses),
  fetal_beat_confirm = COALESCE(sm.fetal_beat_confirm, c.fetal_beat_confirm),
  sign_date = COALESCE(sm.sign_date, c.sign_date),
  transfer_date = COALESCE(sm.transfer_date, c.transfer_date),
  beta_confirm_date = COALESCE(sm.beta_confirm_date, c.beta_confirm_date),
  due_date = COALESCE(sm.due_date, c.due_date),
  clinic = COALESCE(sm.clinic, c.clinic),
  embryos = COALESCE(sm.embryos, c.embryos),
  lawyer = COALESCE(sm.lawyer, c.lawyer),
  company = COALESCE(sm.company, c.company),
  files = COALESCE(sm.files, c.files, '{}'::jsonb),
  status = COALESCE(sm.status, c.status, 'active'),
  created_by = COALESCE(sm.created_by, c.created_by),
  updated_at = GREATEST(sm.updated_at, c.updated_at)
FROM cases c
WHERE 
  (sm.surrogate_id = c.surrogate_id AND sm.parent_id = c.first_parent_id)
  OR (sm.surrogate_id = c.surrogate_id AND sm.parent_id = c.second_parent_id)
  OR (sm.surrogate_id = c.surrogate_id AND c.first_parent_id IS NULL AND c.second_parent_id IS NULL);

-- Step 4: Update case_managers table to reference matches instead of cases
-- First, add match_id column to case_managers
ALTER TABLE case_managers
  ADD COLUMN IF NOT EXISTS match_id UUID REFERENCES surrogate_matches(id) ON DELETE CASCADE;

-- Migrate case_id to match_id by matching cases to surrogate_matches
UPDATE case_managers cm
SET match_id = sm.id
FROM cases c
JOIN surrogate_matches sm ON 
  (sm.surrogate_id = c.surrogate_id AND sm.parent_id = c.first_parent_id)
  OR (sm.surrogate_id = c.surrogate_id AND sm.parent_id = c.second_parent_id)
WHERE cm.case_id = c.id;

-- Create index for match_id
CREATE INDEX IF NOT EXISTS idx_case_managers_match_id ON case_managers(match_id);

-- Step 5: Drop foreign key constraint on case_id, then drop case_id column
ALTER TABLE case_managers DROP CONSTRAINT IF EXISTS case_managers_case_id_fkey;
ALTER TABLE case_managers DROP COLUMN IF EXISTS case_id;

-- Rename case_managers to match_managers for clarity
ALTER TABLE case_managers RENAME TO match_managers;

-- Update indexes
DROP INDEX IF EXISTS idx_case_managers_case_id;
CREATE INDEX IF NOT EXISTS idx_match_managers_match_id ON match_managers(match_id);
CREATE INDEX IF NOT EXISTS idx_match_managers_manager_id ON match_managers(manager_id);

-- Update unique constraint
ALTER TABLE match_managers DROP CONSTRAINT IF EXISTS case_managers_case_id_manager_id_key;
ALTER TABLE match_managers ADD CONSTRAINT match_managers_match_id_manager_id_key UNIQUE(match_id, manager_id);

-- Step 6: Update case_steps and case_updates tables to reference matches
-- First, add match_id columns
ALTER TABLE case_steps
  ADD COLUMN IF NOT EXISTS match_id UUID REFERENCES surrogate_matches(id) ON DELETE CASCADE;

ALTER TABLE case_updates
  ADD COLUMN IF NOT EXISTS match_id UUID REFERENCES surrogate_matches(id) ON DELETE CASCADE;

-- Migrate case_id to match_id
UPDATE case_steps cs
SET match_id = sm.id
FROM cases c
JOIN surrogate_matches sm ON 
  (sm.surrogate_id = c.surrogate_id AND sm.parent_id = c.first_parent_id)
  OR (sm.surrogate_id = c.surrogate_id AND sm.parent_id = c.second_parent_id)
WHERE cs.case_id = c.id;

UPDATE case_updates cu
SET match_id = sm.id
FROM cases c
JOIN surrogate_matches sm ON 
  (sm.surrogate_id = c.surrogate_id AND sm.parent_id = c.first_parent_id)
  OR (sm.surrogate_id = c.surrogate_id AND sm.parent_id = c.second_parent_id)
WHERE cu.case_id = c.id;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_case_steps_match_id ON case_steps(match_id);
CREATE INDEX IF NOT EXISTS idx_case_updates_match_id ON case_updates(match_id);

-- Drop foreign key constraints and case_id columns
ALTER TABLE case_steps DROP CONSTRAINT IF EXISTS case_steps_case_id_fkey;
ALTER TABLE case_steps DROP COLUMN IF EXISTS case_id;

ALTER TABLE case_updates DROP CONSTRAINT IF EXISTS case_updates_case_id_fkey;
ALTER TABLE case_updates DROP COLUMN IF EXISTS case_id;

-- Rename tables for clarity
ALTER TABLE case_steps RENAME TO match_steps;
ALTER TABLE case_updates RENAME TO match_updates;

-- Update indexes
DROP INDEX IF EXISTS idx_case_steps_case_id;
DROP INDEX IF EXISTS idx_case_updates_case_id;
CREATE INDEX IF NOT EXISTS idx_match_steps_match_id ON match_steps(match_id);
CREATE INDEX IF NOT EXISTS idx_match_updates_match_id ON match_updates(match_id);

-- Update unique constraint in match_steps
ALTER TABLE match_steps DROP CONSTRAINT IF EXISTS case_steps_case_id_stage_number_step_number_key;
ALTER TABLE match_steps ADD CONSTRAINT match_steps_match_id_stage_number_step_number_key UNIQUE(match_id, stage_number, step_number);

-- Step 7: Drop the cases table and its related objects
-- Drop triggers first
DROP TRIGGER IF EXISTS update_cases_updated_at_trigger ON cases;
DROP TRIGGER IF EXISTS update_case_steps_updated_at_trigger ON match_steps;

-- Drop functions (keep them if used elsewhere, but typically safe to drop)
DROP FUNCTION IF EXISTS update_cases_updated_at();
DROP FUNCTION IF EXISTS update_case_steps_updated_at();

-- Drop indexes on cases table
DROP INDEX IF EXISTS idx_cases_claim_id;
DROP INDEX IF EXISTS idx_cases_surrogate_id;
DROP INDEX IF EXISTS idx_cases_first_parent_id;
DROP INDEX IF EXISTS idx_cases_manager_id;
DROP INDEX IF EXISTS idx_cases_branch_id;
DROP INDEX IF EXISTS idx_cases_status;
DROP INDEX IF EXISTS idx_cases_created_at;

-- Drop the cases table
DROP TABLE IF EXISTS cases CASCADE;

-- Step 8: Update RLS policies
-- Drop old policies
DROP POLICY IF EXISTS "Service role can access cases" ON cases;
DROP POLICY IF EXISTS "Service role can access case_managers" ON match_managers;
DROP POLICY IF EXISTS "Service role can access case_steps" ON match_steps;
DROP POLICY IF EXISTS "Service role can access case_updates" ON match_updates;

-- Create new policies for renamed tables
DROP POLICY IF EXISTS "Service role can access match_managers" ON match_managers;
CREATE POLICY "Service role can access match_managers"
  ON match_managers
  FOR ALL
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can access match_steps" ON match_steps;
CREATE POLICY "Service role can access match_steps"
  ON match_steps
  FOR ALL
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can access match_updates" ON match_updates;
CREATE POLICY "Service role can access match_updates"
  ON match_updates
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Step 9: Add comments
COMMENT ON COLUMN surrogate_matches.claim_id IS 'Unique claim/case identifier (merged from cases table)';
COMMENT ON COLUMN surrogate_matches.case_type IS 'Type of case: Surrogacy, Egg Donation, or Embryo Donation';
COMMENT ON COLUMN surrogate_matches.files IS 'JSONB object storing file references for various document types';
COMMENT ON TABLE match_managers IS 'Many-to-many relationship between matches and managers (renamed from case_managers)';
COMMENT ON TABLE match_steps IS 'Tracks step-by-step progress for each match (renamed from case_steps)';
COMMENT ON TABLE match_updates IS 'Admin updates, notes, and transaction logs for matches (renamed from case_updates)';


