-- Create a function to delete denied appointments older than 1 day
CREATE OR REPLACE FUNCTION delete_old_denied_appointments()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM appointments
  WHERE status = 'denied'
  AND updated_at < NOW() - INTERVAL '1 day';
END;
$$;

-- Create a trigger to run daily cleanup
-- Note: This requires pg_cron extension for scheduled execution
-- For now, we'll create the function and it can be called manually or via an edge function

-- Add a comment to remind about scheduling
COMMENT ON FUNCTION delete_old_denied_appointments() IS 'Deletes appointments with denied status that are older than 1 day. Should be scheduled to run daily.';
