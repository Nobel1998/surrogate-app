-- Allow parent users to refer potential parents (commission); surrogate refers surrogates.
-- referral_type: 'surrogate' = referred person is a surrogate, 'potential_parent' = referred person is a potential parent.

ALTER TABLE referral_submissions
  ADD COLUMN IF NOT EXISTS referral_type TEXT DEFAULT 'surrogate';

COMMENT ON COLUMN referral_submissions.referral_type IS 'surrogate = referred surrogate; potential_parent = referred potential parent (submitted by parent).';
