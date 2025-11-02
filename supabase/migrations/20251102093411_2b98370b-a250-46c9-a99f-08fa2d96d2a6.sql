-- Allow deletion of appointments
DROP POLICY IF EXISTS "Anyone can delete appointments" ON appointments;
CREATE POLICY "Anyone can delete appointments"
ON appointments
FOR DELETE
USING (true);

-- Add columns for repeat appointment tracking
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS is_repeat boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS previous_appointment_id uuid REFERENCES appointments(id);

-- Create index for previous appointment lookups
CREATE INDEX IF NOT EXISTS idx_appointments_previous_id ON appointments(previous_appointment_id);