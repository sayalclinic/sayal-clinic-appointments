-- Add gender and location columns to patients table
ALTER TABLE patients 
ADD COLUMN gender text,
ADD COLUMN location text;