-- Add INSERT policy for invoice_notification_logs (for edge function with service role)
CREATE POLICY "Service role can insert invoice notification logs"
ON public.invoice_notification_logs
FOR INSERT
WITH CHECK (true);