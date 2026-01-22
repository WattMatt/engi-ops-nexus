-- Create contractor portal tokens table
CREATE TABLE public.contractor_portal_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE DEFAULT encode(extensions.gen_random_bytes(32), 'hex'),
  contractor_type TEXT NOT NULL CHECK (contractor_type IN ('main_contractor', 'subcontractor')),
  contractor_name TEXT NOT NULL,
  contractor_email TEXT NOT NULL,
  company_name TEXT,
  document_categories TEXT[] DEFAULT '{}',
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  accessed_at TIMESTAMP WITH TIME ZONE,
  access_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create RFI (Request for Information) table
CREATE TABLE public.rfis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  contractor_token_id UUID REFERENCES public.contractor_portal_tokens(id) ON DELETE SET NULL,
  rfi_number TEXT NOT NULL,
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_review', 'answered', 'closed')),
  category TEXT,
  due_date DATE,
  submitted_by_name TEXT NOT NULL,
  submitted_by_email TEXT NOT NULL,
  submitted_by_company TEXT,
  attachments JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create RFI responses table
CREATE TABLE public.rfi_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rfi_id UUID NOT NULL REFERENCES public.rfis(id) ON DELETE CASCADE,
  response_text TEXT NOT NULL,
  responded_by UUID REFERENCES auth.users(id),
  responded_by_name TEXT,
  is_official_response BOOLEAN DEFAULT false,
  attachments JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create contractor portal access log
CREATE TABLE public.contractor_portal_access_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  token_id UUID REFERENCES public.contractor_portal_tokens(id) ON DELETE SET NULL,
  contractor_email TEXT,
  ip_address TEXT,
  user_agent TEXT,
  accessed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.contractor_portal_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rfis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rfi_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contractor_portal_access_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for contractor_portal_tokens
CREATE POLICY "Project members can view contractor tokens" ON public.contractor_portal_tokens
  FOR SELECT USING (public.has_project_access(auth.uid(), project_id) OR public.is_admin(auth.uid()));

CREATE POLICY "Project members can create contractor tokens" ON public.contractor_portal_tokens
  FOR INSERT WITH CHECK (public.has_project_access(auth.uid(), project_id) OR public.is_admin(auth.uid()));

CREATE POLICY "Project members can update contractor tokens" ON public.contractor_portal_tokens
  FOR UPDATE USING (public.has_project_access(auth.uid(), project_id) OR public.is_admin(auth.uid()));

CREATE POLICY "Project members can delete contractor tokens" ON public.contractor_portal_tokens
  FOR DELETE USING (public.has_project_access(auth.uid(), project_id) OR public.is_admin(auth.uid()));

-- RLS Policies for rfis
CREATE POLICY "Project members can view RFIs" ON public.rfis
  FOR SELECT USING (public.has_project_access(auth.uid(), project_id) OR public.is_admin(auth.uid()));

CREATE POLICY "Anyone can create RFIs" ON public.rfis
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Project members can update RFIs" ON public.rfis
  FOR UPDATE USING (public.has_project_access(auth.uid(), project_id) OR public.is_admin(auth.uid()));

-- RLS Policies for rfi_responses
CREATE POLICY "Project members can view RFI responses" ON public.rfi_responses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.rfis r 
      WHERE r.id = rfi_id 
      AND (public.has_project_access(auth.uid(), r.project_id) OR public.is_admin(auth.uid()))
    )
  );

CREATE POLICY "Project members can create RFI responses" ON public.rfi_responses
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.rfis r 
      WHERE r.id = rfi_id 
      AND (public.has_project_access(auth.uid(), r.project_id) OR public.is_admin(auth.uid()))
    )
  );

CREATE POLICY "Anyone can insert RFI responses" ON public.rfi_responses
  FOR INSERT WITH CHECK (true);

-- RLS Policies for contractor_portal_access_log  
CREATE POLICY "Anyone can insert contractor portal access logs" ON public.contractor_portal_access_log
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Project members can view contractor access logs" ON public.contractor_portal_access_log
  FOR SELECT USING (public.has_project_access(auth.uid(), project_id) OR public.is_admin(auth.uid()));

-- Function to validate contractor portal token
CREATE OR REPLACE FUNCTION public.validate_contractor_portal_token(p_token text, p_ip_address text DEFAULT NULL, p_user_agent text DEFAULT NULL)
RETURNS TABLE(is_valid boolean, project_id uuid, contractor_type text, contractor_name text, contractor_email text, company_name text, document_categories text[], expires_at timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_token_record RECORD;
BEGIN
  SELECT t.* INTO v_token_record
  FROM public.contractor_portal_tokens t
  WHERE t.token = p_token AND t.expires_at > now() AND t.is_active = true;
  
  IF v_token_record IS NULL THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::TEXT[], NULL::TIMESTAMPTZ;
    RETURN;
  END IF;
  
  UPDATE public.contractor_portal_tokens
  SET accessed_at = now(), access_count = access_count + 1
  WHERE id = v_token_record.id;
  
  INSERT INTO public.contractor_portal_access_log (project_id, token_id, contractor_email, ip_address, user_agent)
  VALUES (v_token_record.project_id, v_token_record.id, v_token_record.contractor_email, p_ip_address, p_user_agent);
  
  RETURN QUERY SELECT true, v_token_record.project_id, v_token_record.contractor_type, v_token_record.contractor_name, v_token_record.contractor_email, v_token_record.company_name, v_token_record.document_categories, v_token_record.expires_at;
END;
$$;

-- Function to generate next RFI number
CREATE OR REPLACE FUNCTION public.generate_rfi_number(p_project_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) + 1 INTO v_count FROM public.rfis WHERE project_id = p_project_id;
  RETURN 'RFI-' || LPAD(v_count::TEXT, 4, '0');
END;
$$;

-- Trigger for updated_at on rfis
CREATE TRIGGER update_rfis_updated_at
  BEFORE UPDATE ON public.rfis
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Index for faster token lookups
CREATE INDEX idx_contractor_tokens_token ON public.contractor_portal_tokens(token);
CREATE INDEX idx_contractor_tokens_project ON public.contractor_portal_tokens(project_id);
CREATE INDEX idx_rfis_project ON public.rfis(project_id);
CREATE INDEX idx_rfis_status ON public.rfis(status);