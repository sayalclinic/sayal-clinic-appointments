-- Add separate payment method for lab tests
ALTER TABLE public.payments 
ADD COLUMN labs_payment_method text;