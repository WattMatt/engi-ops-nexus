-- Add roadmap_item_id to site_diary_tasks
ALTER TABLE public.site_diary_tasks
ADD COLUMN roadmap_item_id UUID REFERENCES public.project_roadmap_items(id) ON DELETE SET NULL;

-- Index for performance on linked task queries
CREATE INDEX idx_site_diary_tasks_roadmap_item 
ON public.site_diary_tasks(roadmap_item_id) WHERE roadmap_item_id IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.site_diary_tasks.roadmap_item_id IS 'Optional link to a project roadmap item for strategic alignment tracking';