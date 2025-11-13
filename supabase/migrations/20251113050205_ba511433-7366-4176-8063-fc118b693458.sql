-- Add client/recipient information fields to company_settings for PDF cover pages
ALTER TABLE public.company_settings
ADD COLUMN IF NOT EXISTS client_name TEXT,
ADD COLUMN IF NOT EXISTS client_logo_url TEXT,
ADD COLUMN IF NOT EXISTS client_address_line1 TEXT,
ADD COLUMN IF NOT EXISTS client_address_line2 TEXT,
ADD COLUMN IF NOT EXISTS client_phone TEXT;

COMMENT ON COLUMN public.company_settings.client_name IS 'Default client/recipient name for "Prepared For" section on cover pages';
COMMENT ON COLUMN public.company_settings.client_logo_url IS 'Default client logo URL for cover pages';
COMMENT ON COLUMN public.company_settings.client_address_line1 IS 'Client address line 1 for cover pages';
COMMENT ON COLUMN public.company_settings.client_address_line2 IS 'Client address line 2 for cover pages';
COMMENT ON COLUMN public.company_settings.client_phone IS 'Client phone number for cover pages';