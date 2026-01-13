-- Create table for external roadmap review comments
CREATE TABLE public.external_roadmap_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  token_id UUID NOT NULL REFERENCES public.roadmap_share_tokens(id) ON DELETE CASCADE,
  roadmap_item_id UUID REFERENCES public.project_roadmap_items(id) ON DELETE CASCADE,
  comment_text TEXT NOT NULL,
  reviewer_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.external_roadmap_comments ENABLE ROW LEVEL SECURITY;

-- Policies - comments can be created by anyone with a valid token (handled in app logic)
CREATE POLICY "Anyone can view external roadmap comments" 
ON public.external_roadmap_comments 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can create external roadmap comments" 
ON public.external_roadmap_comments 
FOR INSERT 
WITH CHECK (true);

-- Add last_accessed_at column to roadmap_share_tokens if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'roadmap_share_tokens' AND column_name = 'last_accessed_at'
  ) THEN
    ALTER TABLE public.roadmap_share_tokens ADD COLUMN last_accessed_at TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;