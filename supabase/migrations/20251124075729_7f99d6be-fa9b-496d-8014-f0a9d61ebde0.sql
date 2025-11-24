-- Add RLS policy for tenant_tracker_reports table
CREATE POLICY "auth_full_access"
  ON public.tenant_tracker_reports
  FOR ALL
  USING (true)
  WITH CHECK (true);