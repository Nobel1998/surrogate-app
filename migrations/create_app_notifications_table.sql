-- In-app notifications for application status updates (approve / reject / pending)
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS app_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'status_update',
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}'::jsonb,
  read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_app_notifications_user_id ON app_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_app_notifications_created_at ON app_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_app_notifications_user_unread
  ON app_notifications(user_id, read)
  WHERE read = FALSE;

ALTER TABLE app_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own app notifications" ON app_notifications;
CREATE POLICY "Users can view their own app notifications"
  ON app_notifications
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own app notifications" ON app_notifications;
CREATE POLICY "Users can update their own app notifications"
  ON app_notifications
  FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own app notifications" ON app_notifications;
CREATE POLICY "Users can delete their own app notifications"
  ON app_notifications
  FOR DELETE
  USING (auth.uid() = user_id);

-- Inserts are performed by service role / admin client (bypasses RLS)
COMMENT ON TABLE app_notifications IS 'Lightweight in-app notifications (e.g. application approve/reject)';
