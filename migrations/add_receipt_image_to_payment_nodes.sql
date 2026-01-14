-- Add receipt_image_url column to payment_nodes table
-- This column stores the URL of uploaded payment receipt images

ALTER TABLE payment_nodes
ADD COLUMN IF NOT EXISTS receipt_image_url TEXT;

-- Add comment for documentation
COMMENT ON COLUMN payment_nodes.receipt_image_url IS 'URL of the payment receipt image uploaded to Supabase Storage';
