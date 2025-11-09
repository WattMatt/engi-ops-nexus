-- Create table for individual generators within zones
CREATE TABLE IF NOT EXISTS public.zone_generators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id UUID NOT NULL REFERENCES public.generator_zones(id) ON DELETE CASCADE,
  generator_number INTEGER NOT NULL,
  generator_size TEXT,
  generator_cost DECIMAL(15, 2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(zone_id, generator_number)
);

-- Enable RLS
ALTER TABLE public.zone_generators ENABLE ROW LEVEL SECURITY;

-- RLS policies for zone_generators
CREATE POLICY "Users can view zone generators for their projects"
  ON public.zone_generators
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.generator_zones gz
      WHERE gz.id = zone_generators.zone_id
      AND is_project_member(auth.uid(), gz.project_id)
    )
  );

CREATE POLICY "Users can insert zone generators for their projects"
  ON public.zone_generators
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.generator_zones gz
      WHERE gz.id = zone_generators.zone_id
      AND is_project_member(auth.uid(), gz.project_id)
    )
  );

CREATE POLICY "Users can update zone generators for their projects"
  ON public.zone_generators
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.generator_zones gz
      WHERE gz.id = zone_generators.zone_id
      AND is_project_member(auth.uid(), gz.project_id)
    )
  );

CREATE POLICY "Users can delete zone generators for their projects"
  ON public.zone_generators
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.generator_zones gz
      WHERE gz.id = zone_generators.zone_id
      AND is_project_member(auth.uid(), gz.project_id)
    )
  );

-- Add trigger for updated_at
CREATE TRIGGER update_zone_generators_updated_at
  BEFORE UPDATE ON public.zone_generators
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();