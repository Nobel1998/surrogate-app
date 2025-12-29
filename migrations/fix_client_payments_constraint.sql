-- Fix client_payments constraint to use English installment values
-- This migration updates the check constraint if it was created with Chinese values

-- First, drop the existing constraint if it exists
ALTER TABLE client_payments 
  DROP CONSTRAINT IF EXISTS client_payments_payment_installment_check;

-- Add the correct constraint with English values
ALTER TABLE client_payments
  ADD CONSTRAINT client_payments_payment_installment_check 
  CHECK (payment_installment IN ('Installment 1', 'Installment 2', 'Installment 3', 'Installment 4'));

-- If there are any existing rows with Chinese values, update them
-- (This is a safety measure in case the table already has data)
UPDATE client_payments 
SET payment_installment = 'Installment 1' 
WHERE payment_installment = '一期款';

UPDATE client_payments 
SET payment_installment = 'Installment 2' 
WHERE payment_installment = '二期款';

UPDATE client_payments 
SET payment_installment = 'Installment 3' 
WHERE payment_installment = '三期款';

UPDATE client_payments 
SET payment_installment = 'Installment 4' 
WHERE payment_installment = '四期款';

