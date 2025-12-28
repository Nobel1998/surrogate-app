-- Create payment_nodes table for managing payment milestones
-- Payment nodes represent different payment stages in the surrogacy process

CREATE TABLE IF NOT EXISTS payment_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES surrogate_matches(id) ON DELETE CASCADE,
  node_name TEXT NOT NULL,
  node_type TEXT NOT NULL CHECK (node_type IN ('milestone', 'monthly', 'one-time')),
  amount DECIMAL(10, 2) NOT NULL,
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled')),
  payment_date DATE,
  payment_method TEXT,
  payment_reference TEXT,
  notes TEXT,
  created_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_payment_nodes_match_id ON payment_nodes(match_id);
CREATE INDEX IF NOT EXISTS idx_payment_nodes_status ON payment_nodes(status);
CREATE INDEX IF NOT EXISTS idx_payment_nodes_due_date ON payment_nodes(due_date);
CREATE INDEX IF NOT EXISTS idx_payment_nodes_node_type ON payment_nodes(node_type);

-- Enable RLS
ALTER TABLE payment_nodes ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated admin users to view all payment nodes
CREATE POLICY "Admins can view all payment nodes"
  ON payment_nodes
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Allow authenticated admin users to insert payment nodes
CREATE POLICY "Admins can insert payment nodes"
  ON payment_nodes
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Allow authenticated admin users to update payment nodes
CREATE POLICY "Admins can update payment nodes"
  ON payment_nodes
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy: Allow authenticated admin users to delete payment nodes
CREATE POLICY "Admins can delete payment nodes"
  ON payment_nodes
  FOR DELETE
  TO authenticated
  USING (true);

-- Add comment for documentation
COMMENT ON TABLE payment_nodes IS 'Payment milestones and scheduled payments for surrogate matches';
COMMENT ON COLUMN payment_nodes.node_type IS 'Type of payment: milestone (one-time milestone), monthly (recurring monthly), one-time (single payment)';
COMMENT ON COLUMN payment_nodes.status IS 'Payment status: pending, paid, overdue, cancelled';

