-- Add assigned_to column to project_roadmap_items for task assignment
ALTER TABLE public.project_roadmap_items 
ADD COLUMN assigned_to UUID REFERENCES public.project_members(id) ON DELETE SET NULL;

-- Create an index for faster queries when filtering by assignee
CREATE INDEX idx_roadmap_items_assigned_to ON public.project_roadmap_items(assigned_to);

-- Add a comment for documentation
COMMENT ON COLUMN public.project_roadmap_items.assigned_to IS 'References the project_member who is assigned to this roadmap item';