-- Cable Schedule Verification System Tables
-- ==========================================

-- 1. Verification Tokens - Access tokens for electricians
CREATE TABLE public.cable_schedule_verification_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  schedule_id UUID NOT NULL REFERENCES public.cable_schedules(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  electrician_name TEXT NOT NULL,
  electrician_email TEXT NOT NULL,
  company_name TEXT,
  registration_number TEXT,
  password_hash TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  accessed_at TIMESTAMPTZ,
  access_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Verification Records - Main verification record per token
CREATE TABLE public.cable_schedule_verifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  token_id UUID NOT NULL REFERENCES public.cable_schedule_verification_tokens(id) ON DELETE CASCADE,
  schedule_id UUID NOT NULL REFERENCES public.cable_schedules(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'verified', 'issues_found', 'rejected')),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  overall_notes TEXT,
  signoff_name TEXT,
  signoff_position TEXT,
  signoff_company TEXT,
  signoff_registration TEXT,
  signoff_date DATE,
  authorization_confirmed BOOLEAN DEFAULT false,
  signature_image_url TEXT,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Verification Items - Per-cable verification status
CREATE TABLE public.cable_verification_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  verification_id UUID NOT NULL REFERENCES public.cable_schedule_verifications(id) ON DELETE CASCADE,
  cable_entry_id UUID NOT NULL REFERENCES public.cable_entries(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'issue', 'not_installed')),
  notes TEXT,
  photo_urls TEXT[],
  verified_at TIMESTAMPTZ,
  measured_length_actual NUMERIC(10,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (verification_id, cable_entry_id)
);

-- Indexes for performance
CREATE INDEX idx_cable_verification_tokens_schedule ON public.cable_schedule_verification_tokens(schedule_id);
CREATE INDEX idx_cable_verification_tokens_project ON public.cable_schedule_verification_tokens(project_id);
CREATE INDEX idx_cable_verification_tokens_token ON public.cable_schedule_verification_tokens(token);
CREATE INDEX idx_cable_verification_tokens_active ON public.cable_schedule_verification_tokens(is_active, expires_at);
CREATE INDEX idx_cable_verifications_token ON public.cable_schedule_verifications(token_id);
CREATE INDEX idx_cable_verifications_schedule ON public.cable_schedule_verifications(schedule_id);
CREATE INDEX idx_cable_verifications_status ON public.cable_schedule_verifications(status);
CREATE INDEX idx_cable_verification_items_verification ON public.cable_verification_items(verification_id);
CREATE INDEX idx_cable_verification_items_status ON public.cable_verification_items(status);

-- Enable RLS
ALTER TABLE public.cable_schedule_verification_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cable_schedule_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cable_verification_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for cable_schedule_verification_tokens
CREATE POLICY "Project members can view verification tokens"
  ON public.cable_schedule_verification_tokens FOR SELECT
  TO authenticated
  USING (has_project_access(auth.uid(), project_id) OR is_admin(auth.uid()));

CREATE POLICY "Project members can create verification tokens"
  ON public.cable_schedule_verification_tokens FOR INSERT
  TO authenticated
  WITH CHECK (has_project_access(auth.uid(), project_id) OR is_admin(auth.uid()));

CREATE POLICY "Project members can update verification tokens"
  ON public.cable_schedule_verification_tokens FOR UPDATE
  TO authenticated
  USING (has_project_access(auth.uid(), project_id) OR is_admin(auth.uid()));

CREATE POLICY "Project members can delete verification tokens"
  ON public.cable_schedule_verification_tokens FOR DELETE
  TO authenticated
  USING (has_project_access(auth.uid(), project_id) OR is_admin(auth.uid()));

-- RLS Policies for cable_schedule_verifications (via token's project)
CREATE POLICY "Project members can view verifications"
  ON public.cable_schedule_verifications FOR SELECT
  TO authenticated
  USING (
    token_id IN (
      SELECT id FROM public.cable_schedule_verification_tokens 
      WHERE has_project_access(auth.uid(), project_id) OR is_admin(auth.uid())
    )
  );

CREATE POLICY "Project members can manage verifications"
  ON public.cable_schedule_verifications FOR ALL
  TO authenticated
  USING (
    token_id IN (
      SELECT id FROM public.cable_schedule_verification_tokens 
      WHERE has_project_access(auth.uid(), project_id) OR is_admin(auth.uid())
    )
  );

-- RLS Policies for cable_verification_items
CREATE POLICY "Project members can view verification items"
  ON public.cable_verification_items FOR SELECT
  TO authenticated
  USING (
    verification_id IN (
      SELECT v.id FROM public.cable_schedule_verifications v
      JOIN public.cable_schedule_verification_tokens t ON v.token_id = t.id
      WHERE has_project_access(auth.uid(), t.project_id) OR is_admin(auth.uid())
    )
  );

CREATE POLICY "Project members can manage verification items"
  ON public.cable_verification_items FOR ALL
  TO authenticated
  USING (
    verification_id IN (
      SELECT v.id FROM public.cable_schedule_verifications v
      JOIN public.cable_schedule_verification_tokens t ON v.token_id = t.id
      WHERE has_project_access(auth.uid(), t.project_id) OR is_admin(auth.uid())
    )
  );

-- Updated at triggers
CREATE TRIGGER update_cable_schedule_verifications_updated_at
  BEFORE UPDATE ON public.cable_schedule_verifications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cable_verification_items_updated_at
  BEFORE UPDATE ON public.cable_verification_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RPC Function to validate and access verification token (for anonymous/portal access)
CREATE OR REPLACE FUNCTION public.validate_cable_verification_token(p_token TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token_record cable_schedule_verification_tokens%ROWTYPE;
  v_schedule_record cable_schedules%ROWTYPE;
  v_project_record projects%ROWTYPE;
  v_verification_record cable_schedule_verifications%ROWTYPE;
  v_cable_count INTEGER;
BEGIN
  -- Find the token
  SELECT * INTO v_token_record
  FROM cable_schedule_verification_tokens
  WHERE token = p_token
    AND is_active = true
    AND expires_at > now();
  
  IF v_token_record.id IS NULL THEN
    RETURN json_build_object(
      'valid', false,
      'error', 'Token is invalid or expired'
    );
  END IF;
  
  -- Update access tracking
  UPDATE cable_schedule_verification_tokens
  SET accessed_at = now(),
      access_count = access_count + 1
  WHERE id = v_token_record.id;
  
  -- Get schedule details
  SELECT * INTO v_schedule_record
  FROM cable_schedules
  WHERE id = v_token_record.schedule_id;
  
  -- Get project details
  SELECT * INTO v_project_record
  FROM projects
  WHERE id = v_token_record.project_id;
  
  -- Get or create verification record
  SELECT * INTO v_verification_record
  FROM cable_schedule_verifications
  WHERE token_id = v_token_record.id;
  
  IF v_verification_record.id IS NULL THEN
    INSERT INTO cable_schedule_verifications (token_id, schedule_id, status, started_at)
    VALUES (v_token_record.id, v_token_record.schedule_id, 'pending', now())
    RETURNING * INTO v_verification_record;
  END IF;
  
  -- Get cable count
  SELECT COUNT(*) INTO v_cable_count
  FROM cable_entries
  WHERE schedule_id = v_token_record.schedule_id;
  
  RETURN json_build_object(
    'valid', true,
    'token_id', v_token_record.id,
    'verification_id', v_verification_record.id,
    'schedule', json_build_object(
      'id', v_schedule_record.id,
      'name', v_schedule_record.name,
      'revision', v_schedule_record.revision,
      'area_name', v_schedule_record.area_name
    ),
    'project', json_build_object(
      'id', v_project_record.id,
      'name', v_project_record.name,
      'project_number', v_project_record.project_number
    ),
    'electrician', json_build_object(
      'name', v_token_record.electrician_name,
      'email', v_token_record.electrician_email,
      'company', v_token_record.company_name,
      'registration', v_token_record.registration_number
    ),
    'verification_status', v_verification_record.status,
    'cable_count', v_cable_count,
    'expires_at', v_token_record.expires_at
  );
END;
$$;

-- Grant execute permission to anon role for portal access
GRANT EXECUTE ON FUNCTION public.validate_cable_verification_token(TEXT) TO anon;

-- Create storage bucket for verification photos
INSERT INTO storage.buckets (id, name, public, allowed_mime_types)
VALUES ('cable-verification-photos', 'cable-verification-photos', false, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Storage policies for verification photos
CREATE POLICY "Authenticated users can upload verification photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'cable-verification-photos');

CREATE POLICY "Authenticated users can view verification photos"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'cable-verification-photos');

CREATE POLICY "Authenticated users can delete verification photos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'cable-verification-photos');