
-- Fix user status to properly reflect pending state for new invites

-- Update handle_new_user to always start with pending_verification
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, status, login_count)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    'pending_verification',
    0
  );
  RETURN NEW;
END;
$$;

-- Update the login trigger to set status to active on first real login
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
  
  -- First real login: set status to active and count as 1
  IF current_login_count IS NULL OR current_login_count = 0 THEN
    UPDATE public.profiles
    SET 
      last_login_at = now(),
      login_count = 1,
      status = 'active'
    WHERE id = NEW.user_id;
  ELSE
    -- Subsequent logins: just increment
    UPDATE public.profiles
    SET 
      last_login_at = now(),
      login_count = login_count + 1,
      status = 'active'
    WHERE id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Fix existing recently invited users who shouldn't be active yet
UPDATE public.profiles
SET 
  status = 'pending_verification',
  login_count = 0,
  last_login_at = NULL
WHERE created_at > now() - interval '2 hours'
  AND status = 'active'
  AND login_count <= 1
  AND id != (SELECT id FROM profiles ORDER BY created_at ASC LIMIT 1); -- Don't touch the original admin
