-- Add due_date and priority columns to roadmap items
ALTER TABLE public.project_roadmap_items 
ADD COLUMN IF NOT EXISTS due_date DATE,
ADD COLUMN IF NOT EXISTS priority TEXT CHECK (priority IN ('low', 'medium', 'high', 'critical'));

-- Create roadmap share tokens table for external access
CREATE TABLE public.roadmap_share_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  reviewer_name TEXT NOT NULL,
  reviewer_email TEXT NOT NULL,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'revoked')),
  permissions TEXT[] NOT NULL DEFAULT ARRAY['view', 'comment']::TEXT[],
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '30 days'),
  accessed_at TIMESTAMP WITH TIME ZONE,
  access_count INTEGER DEFAULT 0
);

-- Enable RLS
ALTER TABLE public.roadmap_share_tokens ENABLE ROW LEVEL SECURITY;

-- RLS policies for roadmap share tokens
CREATE POLICY "Users can view share tokens for their projects" 
ON public.roadmap_share_tokens 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.projects p 
    WHERE p.id = project_id
  )
);

CREATE POLICY "Users can create share tokens" 
ON public.roadmap_share_tokens 
FOR INSERT 
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their share tokens" 
ON public.roadmap_share_tokens 
FOR UPDATE 
USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their share tokens" 
ON public.roadmap_share_tokens 
FOR DELETE 
USING (auth.uid() = created_by);

-- Public policy for token validation (no auth required)
CREATE POLICY "Anyone can validate tokens by access_token" 
ON public.roadmap_share_tokens 
FOR SELECT 
USING (access_token IS NOT NULL);

-- Add index for faster token lookup
CREATE INDEX IF NOT EXISTS idx_roadmap_share_tokens_access_token ON public.roadmap_share_tokens(access_token);
CREATE INDEX IF NOT EXISTS idx_roadmap_share_tokens_project ON public.roadmap_share_tokens(project_id);