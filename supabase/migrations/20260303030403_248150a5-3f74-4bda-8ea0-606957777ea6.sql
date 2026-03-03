
-- Add assignee_ids column (jsonb array of UUIDs) to project_roadmap_items
ALTER TABLE public.project_roadmap_items 
ADD COLUMN IF NOT EXISTS assignee_ids jsonb DEFAULT '[]'::jsonb;

-- Add a comment for clarity
COMMENT ON COLUMN public.project_roadmap_items.assignee_ids IS 'Array of user UUIDs (from profiles.id) assigned to this roadmap item, populated by sync scripts';
