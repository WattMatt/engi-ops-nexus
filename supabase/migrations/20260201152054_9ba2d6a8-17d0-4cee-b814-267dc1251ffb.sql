-- Create table for scheduled review settings
CREATE TABLE public.scheduled_review_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  schedule_frequency TEXT NOT NULL DEFAULT 'weekly' CHECK (schedule_frequency IN ('daily', 'weekly', 'biweekly', 'monthly')),
  schedule_day INTEGER DEFAULT 1, -- Day of week (0-6) or day of month (1-31)
  schedule_time TIME NOT NULL DEFAULT '09:00:00',
  recipient_emails TEXT[] NOT NULL DEFAULT '{}',
  focus_areas TEXT[] NOT NULL DEFAULT ARRAY['ui', 'performance', 'security', 'database', 'components', 'operational'],
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.scheduled_review_settings ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to manage settings (admin function)
CREATE POLICY "Allow authenticated users to view settings"
ON public.scheduled_review_settings FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to update settings"
ON public.scheduled_review_settings FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to insert settings"
ON public.scheduled_review_settings FOR INSERT
TO authenticated
WITH CHECK (true);

-- Create trigger for updated_at
CREATE TRIGGER update_scheduled_review_settings_updated_at
BEFORE UPDATE ON public.scheduled_review_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default settings row
INSERT INTO public.scheduled_review_settings (
  is_enabled,
  schedule_frequency,
  schedule_day,
  schedule_time,
  recipient_emails,
  focus_areas
) VALUES (
  false,
  'weekly',
  5, -- Friday
  '09:00:00',
  ARRAY['arno@wmeng.co.za'],
  ARRAY['ui', 'performance', 'security', 'database', 'components', 'operational']
);