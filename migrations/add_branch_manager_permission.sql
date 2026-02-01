-- Add branch_manager_permission to admin_users for view-only vs can-update
-- Only applies when role = 'branch_manager': 'view' = view only, 'update' = can create/update/delete
ALTER TABLE admin_users
  ADD COLUMN IF NOT EXISTS branch_manager_permission TEXT
  CHECK (branch_manager_permission IS NULL OR branch_manager_permission IN ('view', 'update'));

COMMENT ON COLUMN admin_users.branch_manager_permission IS 'For branch_manager role: view = view only, update = can create/update/delete. Default view.';

-- Set default for existing branch_manager rows to 'view' for safety
UPDATE admin_users
SET branch_manager_permission = 'view'
WHERE role = 'branch_manager' AND branch_manager_permission IS NULL;
