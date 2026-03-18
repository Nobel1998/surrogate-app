-- Allow finance_manager role in admin_users (for read-only payment access)
-- The table has CHECK (role IN ('admin', 'branch_manager')); we add 'finance_manager'.

ALTER TABLE admin_users
  DROP CONSTRAINT IF EXISTS admin_users_role_check;

ALTER TABLE admin_users
  ADD CONSTRAINT admin_users_role_check
  CHECK (role IN ('admin', 'branch_manager', 'finance_manager'));

COMMENT ON COLUMN admin_users.role IS 'Admin role: admin, branch_manager, or finance_manager (read-only, can view Payment Nodes)';
