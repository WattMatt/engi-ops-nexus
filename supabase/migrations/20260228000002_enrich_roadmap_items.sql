-- Enrich project_roadmap_items to match Planner capabilities
ALTER TABLE public.project_roadmap_items
ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium', -- low, medium, high, urgent
ADD COLUMN IF NOT EXISTS due_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS start_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS assigned_to_text TEXT, -- e.g. "Arno Mattheus" (Synced from Planner)
ADD COLUMN IF NOT EXISTS assigned_to_id UUID REFERENCES auth.users(id), -- Linked Nexus User
ADD COLUMN IF NOT EXISTS labels TEXT[], -- Array of tags/labels
ADD COLUMN IF NOT EXISTS checklist JSONB DEFAULT '[]'::jsonb; -- Store checklist items as JSON

-- Add indexes for filtering
CREATE INDEX IF NOT EXISTS idx_roadmap_due_date ON public.project_roadmap_items(due_date);
CREATE INDEX IF NOT EXISTS idx_roadmap_priority ON public.project_roadmap_items(priority);
CREATE INDEX IF NOT EXISTS idx_roadmap_assigned_to ON public.project_roadmap_items(assigned_to_id);
