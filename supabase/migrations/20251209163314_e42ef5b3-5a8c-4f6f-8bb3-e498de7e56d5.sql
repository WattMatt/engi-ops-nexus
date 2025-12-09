-- Create a function to check if there's a valid token for public access
CREATE OR REPLACE FUNCTION public.has_valid_client_portal_token(p_project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.client_portal_tokens
    WHERE project_id = p_project_id
      AND expires_at > now()
  )
$$;

-- Add public SELECT policy for projects (client portal access)
CREATE POLICY "Public can view projects with valid portal token" 
ON public.projects 
FOR SELECT 
TO anon
USING (
  has_valid_client_portal_token(id)
);

-- Add public SELECT policy for tenants (client portal access)  
CREATE POLICY "Public can view tenants with valid portal token"
ON public.tenants
FOR SELECT
TO anon
USING (
  has_valid_client_portal_token(project_id)
);

-- Add public SELECT policy for generator_zones (client portal access)
CREATE POLICY "Public can view generator_zones with valid portal token"
ON public.generator_zones
FOR SELECT
TO anon
USING (
  has_valid_client_portal_token(project_id)
);

-- Add public SELECT policy for handover_documents (client portal access)
CREATE POLICY "Public can view handover_documents with valid portal token"
ON public.handover_documents
FOR SELECT
TO anon
USING (
  has_valid_client_portal_token(project_id)
);