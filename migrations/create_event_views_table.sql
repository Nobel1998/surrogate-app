-- Blog article view tracking (App EventDetailScreen → admin Blog Management)
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.event_views (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  visitor_key TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT event_views_identity_check CHECK (
    user_id IS NOT NULL OR (visitor_key IS NOT NULL AND length(trim(visitor_key)) > 0)
  )
);

CREATE INDEX IF NOT EXISTS idx_event_views_event_id ON public.event_views(event_id);
CREATE INDEX IF NOT EXISTS idx_event_views_event_user ON public.event_views(event_id, user_id);
CREATE INDEX IF NOT EXISTS idx_event_views_event_visitor ON public.event_views(event_id, visitor_key);
CREATE INDEX IF NOT EXISTS idx_event_views_created_at ON public.event_views(created_at DESC);

ALTER TABLE public.event_views ENABLE ROW LEVEL SECURITY;

-- Public read so admin dashboard (anon key) can aggregate like event_likes
DROP POLICY IF EXISTS "Anyone can view event views" ON public.event_views;
CREATE POLICY "Anyone can view event views"
  ON public.event_views
  FOR SELECT
  USING (true);

-- Logged-in users insert their own row
DROP POLICY IF EXISTS "Users can insert their own event views" ON public.event_views;
CREATE POLICY "Users can insert their own event views"
  ON public.event_views
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Guests insert with visitor_key only (no user_id)
DROP POLICY IF EXISTS "Anon can insert guest event views" ON public.event_views;
CREATE POLICY "Anon can insert guest event views"
  ON public.event_views
  FOR INSERT
  TO anon
  WITH CHECK (user_id IS NULL AND visitor_key IS NOT NULL AND length(trim(visitor_key)) > 0);

COMMENT ON TABLE public.event_views IS 'App blog (events) detail page views for admin visitor analytics';
