-- Add receipt_image_url column to client_payments table
-- This column stores the URL of uploaded payment receipt images

ALTER TABLE client_payments
ADD COLUMN IF NOT EXISTS receipt_image_url TEXT;

-- Add comment for documentation
COMMENT ON COLUMN client_payments.receipt_image_url IS 'URL of the payment receipt image uploaded to Supabase Storage';
