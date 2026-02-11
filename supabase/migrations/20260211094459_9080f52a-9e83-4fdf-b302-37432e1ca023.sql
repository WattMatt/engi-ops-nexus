CREATE OR REPLACE FUNCTION public.validate_portal_short_code(p_code text)
 RETURNS TABLE(token text, project_id uuid, contractor_type text, contractor_name text, contractor_email text, company_name text, is_valid boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    t.token,
    t.project_id,
    t.contractor_type,
    t.contractor_name,
    t.contractor_email,
    t.company_name,
    (t.is_active AND t.expires_at > NOW()) AS is_valid
  FROM public.contractor_portal_tokens t
  WHERE t.short_code = UPPER(p_code);
END;
$function$;