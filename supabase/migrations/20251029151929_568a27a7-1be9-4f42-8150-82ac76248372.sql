
-- Fix login tracking to exclude initial account setup
-- Only count as a login if the user has already logged in before

DROP TRIGGER IF EXISTS on_user_login ON auth.sessions;

CREATE OR REPLACE FUNCTION public.update_user_login_stats()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_login_count INTEGER;
BEGIN
  -- Get the current login count
  SELECT login_count INTO current_login_count
  FROM public.profiles
  WHERE id = NEW.user_id;
  
  -- Only track this as a login if they've logged in before
  -- Skip the initial password reset/setup sessions (when login_count is NULL or 0)
  IF current_login_count IS NOT NULL AND current_login_count > 0 THEN
    UPDATE public.profiles
    SET 
      last_login_at = now(),
      login_count = login_count + 1,
      status = 'active'
    WHERE id = NEW.user_id;
  ELSIF current_login_count = 0 THEN
    -- First real login after account setup
    UPDATE public.profiles
    SET 
      last_login_at = now(),
      login_count = 1,
      status = 'active'
    WHERE id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER on_user_login
  AFTER INSERT ON auth.sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_login_stats();

-- Reset login counts for users who only have the initial "fake" login
-- This will set them back to 0 so their next real login is counted as 1
UPDATE public.profiles
SET 
  login_count = 0,
  last_login_at = NULL
WHERE login_count = 1 
  AND status = 'active'
  AND created_at > now() - interval '1 hour'; -- Only recent invites
