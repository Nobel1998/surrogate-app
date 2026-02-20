-- Add read_only to admin_users (for branch managers: view-only access)
ALTER TABLE admin_users
  ADD COLUMN IF NOT EXISTS read_only BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN admin_users.read_only IS 'When true (branch_manager only), user can view but cannot create/update/delete.';
