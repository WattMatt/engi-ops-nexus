-- Create table to track progress on review recommendations
CREATE TABLE public.review_recommendation_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  review_id UUID NOT NULL REFERENCES public.application_reviews(id) ON DELETE CASCADE,
  recommendation_type TEXT NOT NULL, -- 'quickWin', 'priorityAction', 'issue'
  recommendation_key TEXT NOT NULL, -- unique identifier within the review (e.g., title hash or index)
  recommendation_title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'in_progress', 'implemented', 'ignored'
  notes TEXT,
  updated_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(review_id, recommendation_type, recommendation_key)
);

-- Enable RLS
ALTER TABLE public.review_recommendation_progress ENABLE ROW LEVEL SECURITY;

-- Policies - admins and moderators can manage progress
CREATE POLICY "Admins can manage recommendation progress"
ON public.review_recommendation_progress
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'moderator')
  )
);

-- Create index for faster lookups
CREATE INDEX idx_recommendation_progress_review ON public.review_recommendation_progress(review_id);
CREATE INDEX idx_recommendation_progress_status ON public.review_recommendation_progress(status);

-- Trigger for updated_at
CREATE TRIGGER update_review_recommendation_progress_updated_at
  BEFORE UPDATE ON public.review_recommendation_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();