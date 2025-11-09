-- Add columns to track appointment fee and individual test payments
ALTER TABLE payments 
ADD COLUMN appointment_fee numeric DEFAULT 0,
ADD COLUMN test_payments jsonb DEFAULT '[]'::jsonb;

COMMENT ON COLUMN payments.appointment_fee IS 'Fee charged for the appointment consultation';
COMMENT ON COLUMN payments.test_payments IS 'Array of {test_name, amount} for individual test payments';