-- Add checklist (JSONB) and labels (text[]) columns to project_roadmap_items
ALTER TABLE public.project_roadmap_items 
  ADD COLUMN IF NOT EXISTS checklist jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS labels text[] DEFAULT '{}'::text[];