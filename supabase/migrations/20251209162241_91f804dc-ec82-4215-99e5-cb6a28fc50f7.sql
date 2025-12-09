-- Ensure pgcrypto is available in extensions schema
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- Recreate the function with explicit reference to extensions schema
CREATE OR REPLACE FUNCTION public.generate_client_portal_token(p_project_id uuid, p_email text, p_expiry_hours integer DEFAULT 168)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, extensions
AS $function$
DECLARE
  v_token TEXT;
BEGIN
  v_token := encode(extensions.gen_random_bytes(32), 'hex');
  
  INSERT INTO public.client_portal_tokens (project_id, token, email, expires_at)
  VALUES (p_project_id, v_token, p_email, now() + (p_expiry_hours || ' hours')::interval);
  
  RETURN v_token;
END;
$function$;