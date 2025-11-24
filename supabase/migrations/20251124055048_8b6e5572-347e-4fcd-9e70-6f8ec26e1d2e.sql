-- Create global contacts table
CREATE TABLE IF NOT EXISTS public.global_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_type TEXT NOT NULL,
  organization_name TEXT NOT NULL,
  contact_person_name TEXT,
  email TEXT,
  phone TEXT,
  address_line1 TEXT,
  address_line2 TEXT,
  logo_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.global_contacts ENABLE ROW LEVEL SECURITY;

-- Create policies for global contacts
CREATE POLICY "Anyone can view global contacts"
  ON public.global_contacts FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert global contacts"
  ON public.global_contacts FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update global contacts"
  ON public.global_contacts FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete global contacts"
  ON public.global_contacts FOR DELETE
  USING (auth.role() = 'authenticated');

-- Add global_contact_id to project_contacts for linking
ALTER TABLE public.project_contacts 
ADD COLUMN IF NOT EXISTS global_contact_id UUID REFERENCES public.global_contacts(id) ON DELETE SET NULL;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_project_contacts_global_contact_id 
  ON public.project_contacts(global_contact_id);

CREATE INDEX IF NOT EXISTS idx_global_contacts_contact_type 
  ON public.global_contacts(contact_type);

-- Add updated_at trigger for global_contacts
CREATE OR REPLACE FUNCTION public.update_global_contacts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_global_contacts_updated_at
  BEFORE UPDATE ON public.global_contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_global_contacts_updated_at();