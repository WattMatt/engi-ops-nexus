-- Create generator settings table for storing loading rates per category
CREATE TABLE IF NOT EXISTS public.generator_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  standard_kw_per_sqm NUMERIC(10,4) DEFAULT 0.03,
  fast_food_kw_per_sqm NUMERIC(10,4) DEFAULT 0.045,
  restaurant_kw_per_sqm NUMERIC(10,4) DEFAULT 0.045,
  national_kw_per_sqm NUMERIC(10,4) DEFAULT 0.03,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(project_id)
);

-- Enable RLS
ALTER TABLE public.generator_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for generator settings
CREATE POLICY "Users can view generator settings for their projects"
ON public.generator_settings
FOR SELECT
USING (
  project_id IN (
    SELECT project_id FROM public.project_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert generator settings for their projects"
ON public.generator_settings
FOR INSERT
WITH CHECK (
  project_id IN (
    SELECT project_id FROM public.project_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update generator settings for their projects"
ON public.generator_settings
FOR UPDATE
USING (
  project_id IN (
    SELECT project_id FROM public.project_members WHERE user_id = auth.uid()
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_generator_settings_updated_at
BEFORE UPDATE ON public.generator_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();