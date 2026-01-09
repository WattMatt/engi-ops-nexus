-- Add start_date column to project_roadmap_items for Gantt chart support
ALTER TABLE public.project_roadmap_items
ADD COLUMN IF NOT EXISTS start_date date DEFAULT NULL;

-- Add index for date range queries (useful for Gantt chart generation)
CREATE INDEX IF NOT EXISTS idx_roadmap_items_dates 
ON public.project_roadmap_items (project_id, start_date, due_date)
WHERE start_date IS NOT NULL OR due_date IS NOT NULL;