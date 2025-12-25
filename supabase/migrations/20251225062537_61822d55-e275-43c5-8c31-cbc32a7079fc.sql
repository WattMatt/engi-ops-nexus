-- Create floor_plan_folders table for hierarchical folder structure
CREATE TABLE public.floor_plan_folders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  parent_id UUID REFERENCES public.floor_plan_folders(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add folder_id to floor_plan_projects to link designs to folders
ALTER TABLE public.floor_plan_projects 
ADD COLUMN folder_id UUID REFERENCES public.floor_plan_folders(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.floor_plan_folders ENABLE ROW LEVEL SECURITY;

-- Create policies for floor_plan_folders
CREATE POLICY "Users can view all folders" 
ON public.floor_plan_folders 
FOR SELECT 
USING (true);

CREATE POLICY "Users can create folders" 
ON public.floor_plan_folders 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can update folders" 
ON public.floor_plan_folders 
FOR UPDATE 
USING (true);

CREATE POLICY "Users can delete folders" 
ON public.floor_plan_folders 
FOR DELETE 
USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_floor_plan_folders_updated_at
BEFORE UPDATE ON public.floor_plan_folders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();