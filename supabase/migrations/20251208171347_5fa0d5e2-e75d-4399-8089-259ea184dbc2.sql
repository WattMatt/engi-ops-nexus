-- Create client portal settings table
CREATE TABLE public.client_portal_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  is_enabled BOOLEAN DEFAULT true,
  password_hash TEXT,
  link_expiry_hours INTEGER DEFAULT 168,
  require_email BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id)
);

-- Create client portal access tokens table
CREATE TABLE public.client_portal_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  accessed_at TIMESTAMPTZ,
  access_count INTEGER DEFAULT 0
);

-- Create access log table
CREATE TABLE public.client_portal_access_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  token_id UUID REFERENCES public.client_portal_tokens(id) ON DELETE SET NULL,
  email TEXT,
  ip_address TEXT,
  user_agent TEXT,
  accessed_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.client_portal_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_portal_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_portal_access_log ENABLE ROW LEVEL SECURITY;

-- RLS policies for settings (admin/project owners only)
CREATE POLICY "Users can view their project portal settings"
ON public.client_portal_settings FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.projects p 
    WHERE p.id = project_id AND p.created_by = auth.uid()
  )
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Users can manage their project portal settings"
ON public.client_portal_settings FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.projects p 
    WHERE p.id = project_id AND p.created_by = auth.uid()
  )
  OR public.has_role(auth.uid(), 'admin')
);

-- RLS policies for tokens
CREATE POLICY "Users can manage their project tokens"
ON public.client_portal_tokens FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.projects p 
    WHERE p.id = project_id AND p.created_by = auth.uid()
  )
  OR public.has_role(auth.uid(), 'admin')
);

-- Allow public token validation (for client access)
CREATE POLICY "Anyone can validate tokens"
ON public.client_portal_tokens FOR SELECT
USING (true);

-- RLS policies for access log
CREATE POLICY "Users can view their project access logs"
ON public.client_portal_access_log FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.projects p 
    WHERE p.id = project_id AND p.created_by = auth.uid()
  )
  OR public.has_role(auth.uid(), 'admin')
);

-- Allow public insert for logging access
CREATE POLICY "Anyone can log access"
ON public.client_portal_access_log FOR INSERT
WITH CHECK (true);

-- Function to generate secure token
CREATE OR REPLACE FUNCTION public.generate_client_portal_token(
  p_project_id UUID,
  p_email TEXT,
  p_expiry_hours INTEGER DEFAULT 168
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token TEXT;
BEGIN
  v_token := encode(gen_random_bytes(32), 'hex');
  
  INSERT INTO public.client_portal_tokens (project_id, token, email, expires_at)
  VALUES (p_project_id, v_token, p_email, now() + (p_expiry_hours || ' hours')::interval);
  
  RETURN v_token;
END;
$$;

-- Function to validate token and log access
CREATE OR REPLACE FUNCTION public.validate_client_portal_token(
  p_token TEXT,
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS TABLE (
  is_valid BOOLEAN,
  project_id UUID,
  email TEXT,
  expires_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token_record RECORD;
BEGIN
  SELECT t.* INTO v_token_record
  FROM public.client_portal_tokens t
  WHERE t.token = p_token AND t.expires_at > now();
  
  IF v_token_record IS NULL THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::TEXT, NULL::TIMESTAMPTZ;
    RETURN;
  END IF;
  
  UPDATE public.client_portal_tokens
  SET accessed_at = now(), access_count = access_count + 1
  WHERE id = v_token_record.id;
  
  INSERT INTO public.client_portal_access_log (project_id, token_id, email, ip_address, user_agent)
  VALUES (v_token_record.project_id, v_token_record.id, v_token_record.email, p_ip_address, p_user_agent);
  
  RETURN QUERY SELECT true, v_token_record.project_id, v_token_record.email, v_token_record.expires_at;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.validate_client_portal_token TO anon;
GRANT EXECUTE ON FUNCTION public.generate_client_portal_token TO authenticated;