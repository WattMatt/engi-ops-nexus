-- Add completion notification email to projects table
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS completion_notification_email TEXT DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.projects.completion_notification_email IS 'Email address to receive roadmap item completion notifications';

-- Create table to track completion streaks per user per project
CREATE TABLE public.roadmap_completion_streaks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_completion_date DATE,
  total_completions INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, project_id)
);

-- Enable RLS
ALTER TABLE public.roadmap_completion_streaks ENABLE ROW LEVEL SECURITY;

-- Create policies for streak access
CREATE POLICY "Users can view their own streaks"
ON public.roadmap_completion_streaks
FOR SELECT
USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

CREATE POLICY "Users can update their own streaks"
ON public.roadmap_completion_streaks
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own streaks"
ON public.roadmap_completion_streaks
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create function to update streaks on completion
CREATE OR REPLACE FUNCTION public.update_completion_streak(
  p_user_id UUID,
  p_project_id UUID
)
RETURNS TABLE(current_streak INTEGER, longest_streak INTEGER, total_completions INTEGER, is_new_record BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_streak_record RECORD;
  v_today DATE := CURRENT_DATE;
  v_is_new_record BOOLEAN := false;
BEGIN
  -- Get or create streak record
  SELECT * INTO v_streak_record
  FROM roadmap_completion_streaks
  WHERE user_id = p_user_id AND project_id = p_project_id;
  
  IF v_streak_record IS NULL THEN
    -- First completion - create new record
    INSERT INTO roadmap_completion_streaks (user_id, project_id, current_streak, longest_streak, last_completion_date, total_completions)
    VALUES (p_user_id, p_project_id, 1, 1, v_today, 1)
    RETURNING current_streak, longest_streak, total_completions INTO v_streak_record;
    
    RETURN QUERY SELECT 1, 1, 1, true;
    RETURN;
  END IF;
  
  -- Check if streak continues
  IF v_streak_record.last_completion_date = v_today THEN
    -- Same day, just increment total
    UPDATE roadmap_completion_streaks
    SET total_completions = total_completions + 1, updated_at = now()
    WHERE user_id = p_user_id AND project_id = p_project_id;
    
    RETURN QUERY SELECT v_streak_record.current_streak, v_streak_record.longest_streak, v_streak_record.total_completions + 1, false;
    RETURN;
  ELSIF v_streak_record.last_completion_date = v_today - 1 THEN
    -- Consecutive day - extend streak
    v_is_new_record := (v_streak_record.current_streak + 1) > v_streak_record.longest_streak;
    
    UPDATE roadmap_completion_streaks
    SET 
      current_streak = current_streak + 1,
      longest_streak = GREATEST(longest_streak, current_streak + 1),
      last_completion_date = v_today,
      total_completions = total_completions + 1,
      updated_at = now()
    WHERE user_id = p_user_id AND project_id = p_project_id;
    
    RETURN QUERY SELECT 
      v_streak_record.current_streak + 1, 
      GREATEST(v_streak_record.longest_streak, v_streak_record.current_streak + 1),
      v_streak_record.total_completions + 1,
      v_is_new_record;
    RETURN;
  ELSE
    -- Streak broken - reset to 1
    UPDATE roadmap_completion_streaks
    SET 
      current_streak = 1,
      last_completion_date = v_today,
      total_completions = total_completions + 1,
      updated_at = now()
    WHERE user_id = p_user_id AND project_id = p_project_id;
    
    RETURN QUERY SELECT 1, v_streak_record.longest_streak, v_streak_record.total_completions + 1, false;
    RETURN;
  END IF;
END;
$$;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_roadmap_completion_streaks_user_project 
ON public.roadmap_completion_streaks(user_id, project_id);

-- Create index on projects for email
CREATE INDEX IF NOT EXISTS idx_projects_completion_email 
ON public.projects(completion_notification_email) WHERE completion_notification_email IS NOT NULL;