-- Fix search path for generate_review_access_token function with proper extension reference
CREATE OR REPLACE FUNCTION public.generate_review_access_token()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT encode(extensions.gen_random_bytes(32), 'hex')
$$;