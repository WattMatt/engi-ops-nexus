-- Create reference drawings table to link floor plans to final accounts
CREATE TABLE public.final_account_reference_drawings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  final_account_id UUID NOT NULL REFERENCES public.final_accounts(id) ON DELETE CASCADE,
  section_id UUID REFERENCES public.final_account_sections(id) ON DELETE SET NULL,
  shop_subsection_id UUID REFERENCES public.final_account_shop_subsections(id) ON DELETE SET NULL,
  floor_plan_id UUID NOT NULL REFERENCES public.floor_plan_projects(id) ON DELETE CASCADE,
  drawing_name TEXT NOT NULL,
  description TEXT,
  is_primary BOOLEAN DEFAULT false,
  takeoffs_transferred BOOLEAN DEFAULT false,
  transferred_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add source tracking to final account items
ALTER TABLE public.final_account_items 
ADD COLUMN IF NOT EXISTS source_floor_plan_id UUID REFERENCES public.floor_plan_projects(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS source_reference_drawing_id UUID REFERENCES public.final_account_reference_drawings(id) ON DELETE SET NULL;

-- Add linked section tracking to floor plans
ALTER TABLE public.floor_plan_projects
ADD COLUMN IF NOT EXISTS linked_final_account_id UUID REFERENCES public.final_accounts(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS linked_section_id UUID REFERENCES public.final_account_sections(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS linked_shop_subsection_id UUID REFERENCES public.final_account_shop_subsections(id) ON DELETE SET NULL;

-- Indexes for performance
CREATE INDEX idx_ref_drawings_account ON public.final_account_reference_drawings(final_account_id);
CREATE INDEX idx_ref_drawings_section ON public.final_account_reference_drawings(section_id);
CREATE INDEX idx_ref_drawings_floor_plan ON public.final_account_reference_drawings(floor_plan_id);
CREATE INDEX idx_items_source_floor_plan ON public.final_account_items(source_floor_plan_id);

-- Enable RLS
ALTER TABLE public.final_account_reference_drawings ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view reference drawings for their projects"
ON public.final_account_reference_drawings FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.final_accounts fa
    JOIN public.project_members pm ON fa.project_id = pm.project_id
    WHERE fa.id = final_account_id AND pm.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert reference drawings for their projects"
ON public.final_account_reference_drawings FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.final_accounts fa
    JOIN public.project_members pm ON fa.project_id = pm.project_id
    WHERE fa.id = final_account_id AND pm.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update reference drawings for their projects"
ON public.final_account_reference_drawings FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.final_accounts fa
    JOIN public.project_members pm ON fa.project_id = pm.project_id
    WHERE fa.id = final_account_id AND pm.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete reference drawings for their projects"
ON public.final_account_reference_drawings FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.final_accounts fa
    JOIN public.project_members pm ON fa.project_id = pm.project_id
    WHERE fa.id = final_account_id AND pm.user_id = auth.uid()
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_ref_drawings_updated_at
BEFORE UPDATE ON public.final_account_reference_drawings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();