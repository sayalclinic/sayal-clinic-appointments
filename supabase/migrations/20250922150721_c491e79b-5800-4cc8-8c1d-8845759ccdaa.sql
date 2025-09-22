-- Enhance patients table to store comprehensive medical records
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS allergies TEXT;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS current_medications TEXT;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS emergency_contact_name TEXT;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS emergency_contact_phone TEXT;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS insurance_info TEXT;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS blood_type TEXT;

-- Create a table for patient visit history
CREATE TABLE IF NOT EXISTS public.patient_visits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  visit_date DATE NOT NULL,
  visit_notes TEXT,
  diagnosis TEXT,
  treatment_plan TEXT,
  prescriptions TEXT,
  follow_up_needed BOOLEAN DEFAULT false,
  follow_up_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on patient_visits
ALTER TABLE public.patient_visits ENABLE ROW LEVEL SECURITY;

-- Create policies for patient_visits
CREATE POLICY "Anyone can view patient visits" 
ON public.patient_visits 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can create patient visits" 
ON public.patient_visits 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update patient visits" 
ON public.patient_visits 
FOR UPDATE 
USING (true);

-- Create function to update timestamps for patient_visits
CREATE TRIGGER update_patient_visits_updated_at
BEFORE UPDATE ON public.patient_visits
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_patient_visits_patient_id ON public.patient_visits(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_visits_visit_date ON public.patient_visits(visit_date);
CREATE INDEX IF NOT EXISTS idx_patient_visits_appointment_id ON public.patient_visits(appointment_id);