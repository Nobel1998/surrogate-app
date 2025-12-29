-- Create client_payments table for tracking client payment records
-- Tracks payments in 4 installments (一期款, 二期款, 三期款, 四期款)

CREATE TABLE IF NOT EXISTS client_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES surrogate_matches(id) ON DELETE CASCADE,
  payment_installment TEXT NOT NULL CHECK (payment_installment IN ('一期款', '二期款', '三期款', '四期款')),
  amount DECIMAL(10, 2) NOT NULL,
  payment_date DATE NOT NULL,
  payment_method TEXT,
  payment_reference TEXT,
  notes TEXT,
  created_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_client_payments_match_id ON client_payments(match_id);
CREATE INDEX IF NOT EXISTS idx_client_payments_installment ON client_payments(payment_installment);
CREATE INDEX IF NOT EXISTS idx_client_payments_payment_date ON client_payments(payment_date DESC);

-- Enable RLS
ALTER TABLE client_payments ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated admin users to view all client payments
CREATE POLICY "Admins can view all client payments"
  ON client_payments
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Allow authenticated admin users to insert client payments
CREATE POLICY "Admins can insert client payments"
  ON client_payments
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Allow authenticated admin users to update client payments
CREATE POLICY "Admins can update client payments"
  ON client_payments
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy: Allow authenticated admin users to delete client payments
CREATE POLICY "Admins can delete client payments"
  ON client_payments
  FOR DELETE
  TO authenticated
  USING (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_client_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER trigger_update_client_payments_updated_at
  BEFORE UPDATE ON client_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_client_payments_updated_at();

-- Add comments for documentation
COMMENT ON TABLE client_payments IS 'Client payment records for surrogacy matches (4 installments)';
COMMENT ON COLUMN client_payments.payment_installment IS 'Payment installment: 一期款, 二期款, 三期款, 四期款';
COMMENT ON COLUMN client_payments.amount IS 'Payment amount in USD';
COMMENT ON COLUMN client_payments.payment_date IS 'Date when payment was received';

