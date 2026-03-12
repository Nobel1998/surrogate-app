-- Fix: ensure referral_submissions has RLS enabled and proper policies
-- so that authenticated users (surrogates / parents) can submit referrals.

ALTER TABLE referral_submissions ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert their own referrals
CREATE POLICY "Users can insert own referral submissions"
  ON referral_submissions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = referrer_user_id);

-- Allow users to view their own referral submissions
CREATE POLICY "Users can view own referral submissions"
  ON referral_submissions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = referrer_user_id);
