-- Drop the old check constraint
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_payment_method_check;

-- Add updated check constraint with all payment methods
ALTER TABLE public.payments ADD CONSTRAINT payments_payment_method_check 
CHECK (payment_method = ANY (ARRAY['cash'::text, 'upi'::text, 'card'::text, 'google_pay'::text, 'paytm'::text, 'phonepe'::text]));