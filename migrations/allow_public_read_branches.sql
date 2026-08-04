-- Allow app users (and anon if needed) to read public branch contact fields.
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read branches contact info" ON public.branches;
CREATE POLICY "Anyone can read branches contact info"
  ON public.branches
  FOR SELECT
  TO anon, authenticated
  USING (true);

COMMENT ON POLICY "Anyone can read branches contact info" ON public.branches IS
  'Contact Us and similar screens may list office phone/email/address.';
