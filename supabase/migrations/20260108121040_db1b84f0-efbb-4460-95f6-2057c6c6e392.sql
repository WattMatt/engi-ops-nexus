-- Create project_roadmap_items table for interactive project roadmaps
CREATE TABLE public.project_roadmap_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  phase TEXT,
  parent_id UUID REFERENCES public.project_roadmap_items(id) ON DELETE CASCADE,
  sort_order INTEGER DEFAULT 0,
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  completed_by TEXT,
  link_url TEXT,
  link_label TEXT,
  comments TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.project_roadmap_items ENABLE ROW LEVEL SECURITY;

-- Create policies for access
CREATE POLICY "Users can view roadmap items for their projects" 
ON public.project_roadmap_items 
FOR SELECT 
USING (true);

CREATE POLICY "Users can create roadmap items" 
ON public.project_roadmap_items 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can update roadmap items" 
ON public.project_roadmap_items 
FOR UPDATE 
USING (true);

CREATE POLICY "Users can delete roadmap items" 
ON public.project_roadmap_items 
FOR DELETE 
USING (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_project_roadmap_items_updated_at
BEFORE UPDATE ON public.project_roadmap_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();