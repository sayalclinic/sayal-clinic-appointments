-- Remove email column from profiles table since we don't need to store emails
ALTER TABLE public.profiles DROP COLUMN IF EXISTS email;