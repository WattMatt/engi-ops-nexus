-- Create project contacts table for managing all project stakeholders
CREATE TABLE IF NOT EXISTS public.project_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  contact_type TEXT NOT NULL, -- 'client', 'quantity_surveyor', 'architect', 'contractor', 'other'
  organization_name TEXT NOT NULL,
  contact_person_name TEXT,
  email TEXT,
  phone TEXT,
  address_line1 TEXT,
  address_line2 TEXT,
  logo_url TEXT,
  is_primary BOOLEAN DEFAULT false, -- Primary contact for this type
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Add RLS policies
ALTER TABLE public.project_contacts ENABLE ROW LEVEL SECURITY;

-- Allow project members to view contacts
CREATE POLICY "Project members can view contacts"
  ON public.project_contacts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.project_members
      WHERE project_members.project_id = project_contacts.project_id
      AND project_members.user_id = auth.uid()
    )
  );

-- Allow project members to insert contacts
CREATE POLICY "Project members can create contacts"
  ON public.project_contacts
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.project_members
      WHERE project_members.project_id = project_contacts.project_id
      AND project_members.user_id = auth.uid()
    )
  );

-- Allow project members to update contacts
CREATE POLICY "Project members can update contacts"
  ON public.project_contacts
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.project_members
      WHERE project_members.project_id = project_contacts.project_id
      AND project_members.user_id = auth.uid()
    )
  );

-- Allow project members to delete contacts
CREATE POLICY "Project members can delete contacts"
  ON public.project_contacts
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.project_members
      WHERE project_members.project_id = project_contacts.project_id
      AND project_members.user_id = auth.uid()
    )
  );

-- Create index for faster lookups
CREATE INDEX idx_project_contacts_project_id ON public.project_contacts(project_id);
CREATE INDEX idx_project_contacts_type ON public.project_contacts(contact_type);

-- Add trigger for updated_at
CREATE TRIGGER update_project_contacts_updated_at
  BEFORE UPDATE ON public.project_contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.project_contacts IS 'Stores contact information for project stakeholders (clients, QS, architects, etc.)';
COMMENT ON COLUMN public.project_contacts.contact_type IS 'Type of contact: client, quantity_surveyor, architect, contractor, or other';
COMMENT ON COLUMN public.project_contacts.is_primary IS 'Indicates if this is the primary contact for this contact type';