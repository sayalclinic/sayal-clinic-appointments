-- Remove unused patient_visits table
DROP TABLE IF EXISTS public.patient_visits CASCADE;

-- Remove redundant columns from payments table
ALTER TABLE public.payments DROP COLUMN IF EXISTS amount;
ALTER TABLE public.payments DROP COLUMN IF EXISTS tests_done;