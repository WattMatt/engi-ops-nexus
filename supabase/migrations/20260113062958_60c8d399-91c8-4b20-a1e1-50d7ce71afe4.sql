-- Create table for tracking review sessions
CREATE TABLE public.roadmap_review_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  started_by UUID NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'cancelled')),
  summary_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for tracking individual item updates within a review session
CREATE TABLE public.roadmap_item_updates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  review_session_id UUID NOT NULL REFERENCES public.roadmap_review_sessions(id) ON DELETE CASCADE,
  roadmap_item_id UUID NOT NULL REFERENCES public.project_roadmap_items(id) ON DELETE CASCADE,
  previous_status BOOLEAN NOT NULL DEFAULT false,
  new_status BOOLEAN NOT NULL DEFAULT false,
  update_notes TEXT,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.roadmap_review_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roadmap_item_updates ENABLE ROW LEVEL SECURITY;

-- RLS policies for roadmap_review_sessions
CREATE POLICY "Users can view review sessions for their projects"
ON public.roadmap_review_sessions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.project_members pm
    WHERE pm.project_id = roadmap_review_sessions.project_id
    AND pm.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create review sessions for their projects"
ON public.roadmap_review_sessions
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.project_members pm
    WHERE pm.project_id = roadmap_review_sessions.project_id
    AND pm.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own review sessions"
ON public.roadmap_review_sessions
FOR UPDATE
USING (started_by = auth.uid());

-- RLS policies for roadmap_item_updates
CREATE POLICY "Users can view item updates for sessions they can access"
ON public.roadmap_item_updates
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.roadmap_review_sessions rrs
    JOIN public.project_members pm ON pm.project_id = rrs.project_id
    WHERE rrs.id = roadmap_item_updates.review_session_id
    AND pm.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create item updates for their sessions"
ON public.roadmap_item_updates
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.roadmap_review_sessions rrs
    WHERE rrs.id = roadmap_item_updates.review_session_id
    AND rrs.started_by = auth.uid()
  )
);

CREATE POLICY "Users can update their own item updates"
ON public.roadmap_item_updates
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.roadmap_review_sessions rrs
    WHERE rrs.id = roadmap_item_updates.review_session_id
    AND rrs.started_by = auth.uid()
  )
);

-- Add indexes for performance
CREATE INDEX idx_roadmap_review_sessions_project ON public.roadmap_review_sessions(project_id);
CREATE INDEX idx_roadmap_review_sessions_status ON public.roadmap_review_sessions(status);
CREATE INDEX idx_roadmap_item_updates_session ON public.roadmap_item_updates(review_session_id);
CREATE INDEX idx_roadmap_item_updates_item ON public.roadmap_item_updates(roadmap_item_id);

-- Trigger for updated_at
CREATE TRIGGER update_roadmap_review_sessions_updated_at
BEFORE UPDATE ON public.roadmap_review_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();