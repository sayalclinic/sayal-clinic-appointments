-- Add requires_payment field to appointments table
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS requires_payment boolean DEFAULT true;