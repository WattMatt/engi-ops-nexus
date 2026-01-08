-- Create table for roadmap item comments
CREATE TABLE public.roadmap_item_comments (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    roadmap_item_id UUID NOT NULL REFERENCES public.project_roadmap_items(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.roadmap_item_comments ENABLE ROW LEVEL SECURITY;

-- Policy: All authenticated users can view comments on items they have project access to
CREATE POLICY "Users can view roadmap comments" 
ON public.roadmap_item_comments 
FOR SELECT 
TO authenticated
USING (true);

-- Policy: Authenticated users can create comments
CREATE POLICY "Users can create comments" 
ON public.roadmap_item_comments 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own comments
CREATE POLICY "Users can update own comments" 
ON public.roadmap_item_comments 
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id);

-- Policy: Users can delete their own comments
CREATE POLICY "Users can delete own comments" 
ON public.roadmap_item_comments 
FOR DELETE 
TO authenticated
USING (auth.uid() = user_id);

-- Create updated_at trigger
CREATE TRIGGER update_roadmap_comments_updated_at
BEFORE UPDATE ON public.roadmap_item_comments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for live collaboration
ALTER PUBLICATION supabase_realtime ADD TABLE public.roadmap_item_comments;