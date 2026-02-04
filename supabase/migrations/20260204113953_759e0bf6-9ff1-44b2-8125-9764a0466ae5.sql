-- Create table for PM-defined expected inspections
CREATE TABLE public.project_inspection_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  inspection_type TEXT NOT NULL,
  location TEXT NOT NULL,
  description TEXT,
  expected_date DATE,
  sort_order INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'ready_for_inspection', 'scheduled', 'passed', 'failed', 'not_applicable')),
  contractor_notes TEXT,
  contractor_ready_at TIMESTAMPTZ,
  inspection_date DATE,
  inspector_name TEXT,
  inspector_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.project_inspection_items ENABLE ROW LEVEL SECURITY;

-- Policies for authenticated users (project team)
CREATE POLICY "Authenticated users can view project inspection items"
ON public.project_inspection_items
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can create inspection items"
ON public.project_inspection_items
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update inspection items"
ON public.project_inspection_items
FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete inspection items"
ON public.project_inspection_items
FOR DELETE
TO authenticated
USING (true);

-- Policy for anonymous users (contractor portal via token)
CREATE POLICY "Anonymous users can view project inspection items"
ON public.project_inspection_items
FOR SELECT
TO anon
USING (true);

CREATE POLICY "Anonymous users can update inspection status"
ON public.project_inspection_items
FOR UPDATE
TO anon
USING (true);

-- Create updated_at trigger
CREATE TRIGGER update_project_inspection_items_updated_at
BEFORE UPDATE ON public.project_inspection_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for faster queries
CREATE INDEX idx_project_inspection_items_project_id ON public.project_inspection_items(project_id);
CREATE INDEX idx_project_inspection_items_status ON public.project_inspection_items(status);