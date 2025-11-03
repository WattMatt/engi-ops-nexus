-- Create table for generator sizing data
CREATE TABLE IF NOT EXISTS public.generator_sizing_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL,
  rating TEXT NOT NULL,
  load_25 NUMERIC NOT NULL DEFAULT 0,
  load_50 NUMERIC NOT NULL DEFAULT 0,
  load_75 NUMERIC NOT NULL DEFAULT 0,
  load_100 NUMERIC NOT NULL DEFAULT 0,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(project_id, rating)
);

-- Enable RLS
ALTER TABLE public.generator_sizing_data ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view generator sizing data for their projects"
  ON public.generator_sizing_data
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = generator_sizing_data.project_id
      AND project_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert generator sizing data for their projects"
  ON public.generator_sizing_data
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = generator_sizing_data.project_id
      AND project_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update generator sizing data for their projects"
  ON public.generator_sizing_data
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = generator_sizing_data.project_id
      AND project_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete generator sizing data for their projects"
  ON public.generator_sizing_data
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = generator_sizing_data.project_id
      AND project_members.user_id = auth.uid()
    )
  );

-- Create index for better performance
CREATE INDEX idx_generator_sizing_data_project_id ON public.generator_sizing_data(project_id);

-- Create trigger for updated_at
CREATE TRIGGER update_generator_sizing_data_updated_at
  BEFORE UPDATE ON public.generator_sizing_data
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();