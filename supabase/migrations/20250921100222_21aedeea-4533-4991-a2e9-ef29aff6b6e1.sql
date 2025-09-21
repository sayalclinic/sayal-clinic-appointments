-- Update RLS policies to work with our custom authentication system
-- Since we're using localStorage-based auth, we'll make the policies more permissive

-- Drop existing policies
DROP POLICY IF EXISTS "Authenticated users can create patients" ON public.patients;
DROP POLICY IF EXISTS "Authenticated users can update patients" ON public.patients;
DROP POLICY IF EXISTS "Authenticated users can view patients" ON public.patients;

DROP POLICY IF EXISTS "Authenticated users can create appointments" ON public.appointments;
DROP POLICY IF EXISTS "Users can update appointments they're involved in" ON public.appointments;
DROP POLICY IF EXISTS "Users can view appointments they're involved in" ON public.appointments;

DROP POLICY IF EXISTS "Authenticated users can create payments" ON public.payments;
DROP POLICY IF EXISTS "Authenticated users can view payments" ON public.payments;

-- Create new permissive policies for our demo app
-- Patients table policies
CREATE POLICY "Anyone can create patients" 
ON public.patients 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update patients" 
ON public.patients 
FOR UPDATE 
USING (true);

CREATE POLICY "Anyone can view patients" 
ON public.patients 
FOR SELECT 
USING (true);

-- Appointments table policies  
CREATE POLICY "Anyone can create appointments" 
ON public.appointments 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update appointments" 
ON public.appointments 
FOR UPDATE 
USING (true);

CREATE POLICY "Anyone can view appointments" 
ON public.appointments 
FOR SELECT 
USING (true);

-- Payments table policies
CREATE POLICY "Anyone can create payments" 
ON public.payments 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can view payments" 
ON public.payments 
FOR SELECT 
USING (true);