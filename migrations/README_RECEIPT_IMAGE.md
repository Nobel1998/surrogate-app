# Payment Receipt Image Migration Guide

## Error Message
If you see this error:
```
{"error":"Could not find the 'receipt_image_url' column of 'client_payments' in the schema cache"}
```

This means the `receipt_image_url` column has not been added to the database tables yet.

## Solution Steps

### 1. Login to Supabase Dashboard
- Go to https://supabase.com/dashboard
- Select your project

### 2. Open SQL Editor
- Click "SQL Editor" in the left menu
- Click "New query" to create a new query

### 3. Run Migration for Client Payments
Copy and paste the entire content of `migrations/add_receipt_image_to_client_payments.sql`:

```sql
-- Add receipt_image_url column to client_payments table
-- This column stores the URL of uploaded payment receipt images

ALTER TABLE client_payments
ADD COLUMN IF NOT EXISTS receipt_image_url TEXT;

-- Add comment for documentation
COMMENT ON COLUMN client_payments.receipt_image_url IS 'URL of the payment receipt image uploaded to Supabase Storage';
```

Click "Run" to execute.

### 4. Run Migration for Payment Nodes
Copy and paste the entire content of `migrations/add_receipt_image_to_payment_nodes.sql`:

```sql
-- Add receipt_image_url column to payment_nodes table
-- This column stores the URL of uploaded payment receipt images

ALTER TABLE payment_nodes
ADD COLUMN IF NOT EXISTS receipt_image_url TEXT;

-- Add comment for documentation
COMMENT ON COLUMN payment_nodes.receipt_image_url IS 'URL of the payment receipt image uploaded to Supabase Storage';
```

Click "Run" to execute.

### 5. Verify Columns Added
Run this query to verify the columns exist:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name IN ('client_payments', 'payment_nodes')
AND column_name = 'receipt_image_url';
```

You should see 2 rows returned (one for each table).

### 6. Refresh Application
- Refresh your browser
- The error should be gone
- You should now be able to upload receipt images in both Payment Node and Client Payment forms

## Features
After running the migrations, you can:
- Upload payment receipt images when creating/editing Payment Nodes
- Upload payment receipt images when creating/editing Client Payments
- View receipt images in the payment table
- Click on images to view them in full size

## File Size Limit
- Maximum file size: 5MB
- Supported formats: JPEG, PNG, GIF, WebP
