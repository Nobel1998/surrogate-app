-- Referral submissions: app users submit "介绍的孕妈信息" (referred surrogate info).
-- Admin views list via backend API (service role).

CREATE TABLE IF NOT EXISTS public.referral_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  referrer_name TEXT,
  referrer_email TEXT,
  referred_surrogate_name TEXT NOT NULL,
  referred_surrogate_phone TEXT NOT NULL,
  referred_surrogate_email TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_referral_submissions_created_at
  ON public.referral_submissions (created_at DESC);

ALTER TABLE public.referral_submissions ENABLE ROW LEVEL SECURITY;

-- Authenticated app users can only INSERT their own submission (referrer_user_id = auth.uid()).
CREATE POLICY "Allow authenticated insert own referral"
  ON public.referral_submissions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = referrer_user_id);

-- No SELECT for app users; admin uses service role to list all.
COMMENT ON TABLE public.referral_submissions IS 'User-submitted referred surrogate info; admin views in dashboard.';
