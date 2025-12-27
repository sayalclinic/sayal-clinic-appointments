-- Add policy to allow updating payments
CREATE POLICY "Anyone can update payments" 
ON public.payments 
FOR UPDATE 
USING (true);