-- Fix account deletion: FKs without ON DELETE + points trigger permissions.
-- Run in Supabase SQL Editor if Edge Function still returns "Database error deleting user".

-- 1) Non-cascade FKs that block auth.users delete
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'events_created_by_fkey'
  ) THEN
    ALTER TABLE public.events DROP CONSTRAINT events_created_by_fkey;
  END IF;
END $$;

ALTER TABLE public.events
  ADD CONSTRAINT events_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'reward_requests_processed_by_fkey'
  ) THEN
    ALTER TABLE public.reward_requests DROP CONSTRAINT reward_requests_processed_by_fkey;
  END IF;
END $$;

ALTER TABLE public.reward_requests
  ADD CONSTRAINT reward_requests_processed_by_fkey
  FOREIGN KEY (processed_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- 2) points_rewards DELETE trigger must be SECURITY DEFINER so CASCADE from
--    auth.users (as supabase_auth_admin) can update public.profiles.
CREATE OR REPLACE FUNCTION public.update_user_total_points()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_user_id UUID;
BEGIN
  target_user_id := COALESCE(NEW.user_id, OLD.user_id);

  UPDATE public.profiles
  SET total_points = LEAST(
    5000,
    COALESCE(
      (
        SELECT SUM(points)
        FROM public.points_rewards
        WHERE user_id = target_user_id
      ),
      0
    )
  )
  WHERE id = target_user_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;
