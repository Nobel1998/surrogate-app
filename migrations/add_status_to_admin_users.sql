-- Add status column to admin_users
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected'));

-- Update existing users to be approved (though default handles this for new rows, 
-- it's good practice to ensure all existing rows are explicitly approved if they were somehow null)
UPDATE admin_users SET status = 'approved' WHERE status IS NULL;
