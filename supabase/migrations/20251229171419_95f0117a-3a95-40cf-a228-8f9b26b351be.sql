-- Add is_lab_only column to appointments table
ALTER TABLE public.appointments 
ADD COLUMN is_lab_only BOOLEAN DEFAULT false;

-- Add comment to explain the column
COMMENT ON COLUMN public.appointments.is_lab_only IS 'Indicates if this is a lab-only visit (no doctor consultation, no approval needed)';