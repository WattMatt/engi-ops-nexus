-- Add contractor tracking fields to cable_entries
ALTER TABLE public.cable_entries
ADD COLUMN IF NOT EXISTS contractor_confirmed boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS contractor_confirmed_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS contractor_confirmed_by text,
ADD COLUMN IF NOT EXISTS contractor_installed boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS contractor_installed_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS contractor_installed_by text,
ADD COLUMN IF NOT EXISTS contractor_measured_length numeric,
ADD COLUMN IF NOT EXISTS contractor_notes text,
ADD COLUMN IF NOT EXISTS contractor_submitted_at timestamp with time zone;

-- Create index for efficient filtering
CREATE INDEX IF NOT EXISTS idx_cable_entries_contractor_status 
ON public.cable_entries (contractor_confirmed, contractor_installed);

-- Add comment for documentation
COMMENT ON COLUMN public.cable_entries.contractor_confirmed IS 'Contractor has confirmed receipt of cable instruction';
COMMENT ON COLUMN public.cable_entries.contractor_installed IS 'Contractor has marked cable as installed';
COMMENT ON COLUMN public.cable_entries.contractor_measured_length IS 'Actual length measured by contractor on site';