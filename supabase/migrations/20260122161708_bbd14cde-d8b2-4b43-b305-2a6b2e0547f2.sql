-- Create trigger function to update roadmap_completion_streaks when items are completed
CREATE OR REPLACE FUNCTION public.update_roadmap_completion_streak()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
  v_project_id UUID;
  v_today DATE := CURRENT_DATE;
  v_existing_record RECORD;
  v_new_streak INTEGER;
BEGIN
  -- Only process when marking as complete (not uncompleting)
  IF NEW.is_completed = true AND (OLD.is_completed = false OR OLD.is_completed IS NULL) THEN
    -- Get the user ID from completed_by (which should be a UUID stored as text)
    IF NEW.completed_by IS NOT NULL THEN
      BEGIN
        v_user_id := NEW.completed_by::UUID;
      EXCEPTION WHEN OTHERS THEN
        -- If completed_by is not a valid UUID, skip streak tracking
        RETURN NEW;
      END;
    ELSE
      -- No user attribution, skip streak tracking
      RETURN NEW;
    END IF;
    
    v_project_id := NEW.project_id;
    
    -- Check if user already has a streak record
    SELECT * INTO v_existing_record
    FROM public.roadmap_completion_streaks
    WHERE user_id = v_user_id;
    
    IF FOUND THEN
      -- User has existing record
      IF v_existing_record.last_completion_date = v_today THEN
        -- Already completed something today, just increment total
        UPDATE public.roadmap_completion_streaks
        SET 
          total_completions = total_completions + 1,
          updated_at = now()
        WHERE user_id = v_user_id;
      ELSIF v_existing_record.last_completion_date = v_today - INTERVAL '1 day' THEN
        -- Consecutive day, extend streak
        v_new_streak := v_existing_record.current_streak + 1;
        UPDATE public.roadmap_completion_streaks
        SET 
          current_streak = v_new_streak,
          longest_streak = GREATEST(longest_streak, v_new_streak),
          last_completion_date = v_today,
          total_completions = total_completions + 1,
          updated_at = now()
        WHERE user_id = v_user_id;
      ELSE
        -- Streak broken, reset to 1
        UPDATE public.roadmap_completion_streaks
        SET 
          current_streak = 1,
          last_completion_date = v_today,
          total_completions = total_completions + 1,
          updated_at = now()
        WHERE user_id = v_user_id;
      END IF;
    ELSE
      -- First completion ever for this user
      INSERT INTO public.roadmap_completion_streaks (
        user_id,
        project_id,
        current_streak,
        longest_streak,
        last_completion_date,
        total_completions
      ) VALUES (
        v_user_id,
        v_project_id,
        1,
        1,
        v_today,
        1
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on project_roadmap_items
DROP TRIGGER IF EXISTS track_roadmap_completion_streak ON public.project_roadmap_items;
CREATE TRIGGER track_roadmap_completion_streak
  AFTER UPDATE ON public.project_roadmap_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_roadmap_completion_streak();