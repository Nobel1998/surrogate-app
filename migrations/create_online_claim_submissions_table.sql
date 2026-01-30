-- Online Claim Submissions: 孕妈提交发票/报销单，每人在一个 match 周期内可提交 3-5 次
-- App 端：提交报销（发票+金额+说明）；Admin 端：实时查看该 match 下该孕妈的所有提交

CREATE TABLE IF NOT EXISTS online_claim_submissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  match_id UUID REFERENCES surrogate_matches(id) ON DELETE SET NULL,
  file_url TEXT NOT NULL,
  file_name TEXT,
  amount DECIMAL(12, 2),
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_online_claim_submissions_user_id ON online_claim_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_online_claim_submissions_match_id ON online_claim_submissions(match_id);
CREATE INDEX IF NOT EXISTS idx_online_claim_submissions_created_at ON online_claim_submissions(created_at DESC);

ALTER TABLE online_claim_submissions ENABLE ROW LEVEL SECURITY;

-- 孕妈只能查看、插入自己的记录
DROP POLICY IF EXISTS "Users can view own online claim submissions" ON online_claim_submissions;
CREATE POLICY "Users can view own online claim submissions"
  ON online_claim_submissions FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own online claim submissions" ON online_claim_submissions;
CREATE POLICY "Users can insert own online claim submissions"
  ON online_claim_submissions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE online_claim_submissions IS 'Surrogate expense reimbursement submissions (invoices/receipts), 3-5 per surrogate per match';
COMMENT ON COLUMN online_claim_submissions.amount IS 'Reimbursement amount in USD';
COMMENT ON COLUMN online_claim_submissions.status IS 'pending, approved, or rejected';
