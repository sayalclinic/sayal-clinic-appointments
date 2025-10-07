-- Add patient_name column to appointments table
ALTER TABLE public.appointments ADD COLUMN patient_name text;

-- Optionally backfill existing appointments with patient names from the patients table
UPDATE public.appointments 
SET patient_name = patients.name 
FROM public.patients 
WHERE appointments.patient_id = patients.id;