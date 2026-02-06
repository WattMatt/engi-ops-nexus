-- Add session security columns to company_settings table
ALTER TABLE public.company_settings
ADD COLUMN IF NOT EXISTS auto_logout_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS auto_logout_time time DEFAULT '02:00:00',
ADD COLUMN IF NOT EXISTS auto_logout_timezone text DEFAULT 'Africa/Johannesburg';

-- Add comment for documentation
COMMENT ON COLUMN public.company_settings.auto_logout_enabled IS 'Enable automatic daily logout at scheduled time';
COMMENT ON COLUMN public.company_settings.auto_logout_time IS 'Time of day to trigger automatic logout (in configured timezone)';
COMMENT ON COLUMN public.company_settings.auto_logout_timezone IS 'Timezone for the scheduled logout time';