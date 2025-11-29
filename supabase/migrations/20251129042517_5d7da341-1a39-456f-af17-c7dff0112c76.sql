-- Create invoice notification settings table
CREATE TABLE public.invoice_notification_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  notification_email TEXT NOT NULL,
  notification_day INTEGER NOT NULL DEFAULT 1,
  notifications_enabled BOOLEAN DEFAULT true,
  days_before_reminder INTEGER DEFAULT 7,
  include_schedule_summary BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.invoice_notification_settings ENABLE ROW LEVEL SECURITY;

-- Allow admin users to manage settings
CREATE POLICY "Admin users can manage invoice notification settings"
ON public.invoice_notification_settings
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

-- Create table to track sent invoice notifications
CREATE TABLE public.invoice_notification_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  notification_month DATE NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  recipient_email TEXT NOT NULL,
  total_scheduled_amount NUMERIC DEFAULT 0,
  projects_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'sent',
  error_message TEXT
);

ALTER TABLE public.invoice_notification_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin users can view invoice notification logs"
ON public.invoice_notification_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_invoice_notification_settings_updated_at
BEFORE UPDATE ON public.invoice_notification_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();