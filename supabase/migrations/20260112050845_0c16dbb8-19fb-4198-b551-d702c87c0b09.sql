-- Create PRDs table for development planning
CREATE TABLE public.development_prds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  branch_name TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'in_progress', 'completed', 'archived')),
  created_by TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user stories table
CREATE TABLE public.prd_stories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  prd_id UUID NOT NULL REFERENCES public.development_prds(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  acceptance_criteria TEXT[],
  priority INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'done', 'blocked')),
  display_order INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create progress log for learnings
CREATE TABLE public.prd_progress_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  prd_id UUID NOT NULL REFERENCES public.development_prds(id) ON DELETE CASCADE,
  story_id UUID REFERENCES public.prd_stories(id) ON DELETE SET NULL,
  entry TEXT NOT NULL,
  entry_type TEXT NOT NULL DEFAULT 'note' CHECK (entry_type IN ('note', 'learning', 'blocker', 'decision')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.development_prds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prd_stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prd_progress_log ENABLE ROW LEVEL SECURITY;

-- Public read/write policies (adjust based on your auth needs)
CREATE POLICY "Allow all access to development_prds" ON public.development_prds FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to prd_stories" ON public.prd_stories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to prd_progress_log" ON public.prd_progress_log FOR ALL USING (true) WITH CHECK (true);

-- Indexes for performance
CREATE INDEX idx_prd_stories_prd_id ON public.prd_stories(prd_id);
CREATE INDEX idx_prd_stories_status ON public.prd_stories(status);
CREATE INDEX idx_prd_progress_log_prd_id ON public.prd_progress_log(prd_id);

-- Trigger for updated_at
CREATE TRIGGER update_development_prds_updated_at
  BEFORE UPDATE ON public.development_prds
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_prd_stories_updated_at
  BEFORE UPDATE ON public.prd_stories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();