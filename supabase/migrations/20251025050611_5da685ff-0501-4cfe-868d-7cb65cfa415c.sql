-- Create company settings table
CREATE TABLE IF NOT EXISTS company_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL DEFAULT 'WM Consulting',
  company_tagline TEXT DEFAULT 'Engineering Operations Platform',
  company_logo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;

-- Everyone can read company settings (public info on login page)
CREATE POLICY "Anyone can view company settings"
ON company_settings FOR SELECT
USING (true);

-- Only admins can update company settings
CREATE POLICY "Admins can update company settings"
ON company_settings FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert default settings
INSERT INTO company_settings (company_name, company_tagline)
VALUES ('WM Consulting', 'Engineering Operations Platform')
ON CONFLICT DO NOTHING;

-- Add trigger for updated_at
CREATE TRIGGER update_company_settings_updated_at
  BEFORE UPDATE ON company_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();