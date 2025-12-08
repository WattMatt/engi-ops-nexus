-- Add 'client' to the app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'client';

-- Table to assign clients to specific projects
CREATE TABLE public.client_project_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  granted_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, project_id)
);

-- Table to track which report types clients can access per project
CREATE TABLE public.client_report_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_access_id uuid NOT NULL REFERENCES client_project_access(id) ON DELETE CASCADE,
  report_type text NOT NULL CHECK (report_type IN ('tenant_report', 'generator_report', 'cost_report', 'project_documents')),
  can_view boolean DEFAULT true,
  can_comment boolean DEFAULT true,
  can_approve boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(client_access_id, report_type)
);

-- Table for client comments on reports/items
CREATE TABLE public.client_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_comment_id uuid REFERENCES client_comments(id) ON DELETE CASCADE,
  is_resolved boolean DEFAULT false,
  resolved_by uuid REFERENCES auth.users(id),
  resolved_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  report_type text NOT NULL,
  reference_id text,
  comment_text text NOT NULL
);

-- Table for client sign-offs/approvals
CREATE TABLE public.client_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  approved_at timestamp with time zone DEFAULT now(),
  signature_data text,
  report_type text NOT NULL,
  report_version text,
  approval_status text NOT NULL DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected', 'revision_requested')),
  notes text,
  UNIQUE(project_id, report_type, user_id)
);

-- Enable RLS on all tables
ALTER TABLE public.client_project_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_report_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_approvals ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user is a client with project access
CREATE OR REPLACE FUNCTION public.client_has_project_access(p_user_id uuid, p_project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM client_project_access
    WHERE user_id = p_user_id AND project_id = p_project_id
  )
$$;

-- RLS for client_project_access
CREATE POLICY "Admins can manage client access"
ON public.client_project_access FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR user_has_project_access(project_id))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR user_has_project_access(project_id));

CREATE POLICY "Clients can view their own access"
ON public.client_project_access FOR SELECT
USING (user_id = auth.uid());

-- RLS for client_report_permissions
CREATE POLICY "Admins can manage report permissions"
ON public.client_report_permissions FOR ALL
USING (EXISTS (
  SELECT 1 FROM client_project_access cpa
  WHERE cpa.id = client_report_permissions.client_access_id
  AND (has_role(auth.uid(), 'admin'::app_role) OR user_has_project_access(cpa.project_id))
));

CREATE POLICY "Clients can view their own permissions"
ON public.client_report_permissions FOR SELECT
USING (EXISTS (
  SELECT 1 FROM client_project_access cpa
  WHERE cpa.id = client_report_permissions.client_access_id AND cpa.user_id = auth.uid()
));

-- RLS for client_comments
CREATE POLICY "Project members and clients can view comments"
ON public.client_comments FOR SELECT
USING (
  user_has_project_access(project_id) OR 
  client_has_project_access(auth.uid(), project_id)
);

CREATE POLICY "Users can create their own comments"
ON public.client_comments FOR INSERT
WITH CHECK (
  user_id = auth.uid() AND (
    user_has_project_access(project_id) OR 
    client_has_project_access(auth.uid(), project_id)
  )
);

CREATE POLICY "Users can update their own comments"
ON public.client_comments FOR UPDATE
USING (user_id = auth.uid() OR user_has_project_access(project_id));

CREATE POLICY "Admins can delete comments"
ON public.client_comments FOR DELETE
USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- RLS for client_approvals
CREATE POLICY "Project members and clients can view approvals"
ON public.client_approvals FOR SELECT
USING (
  user_has_project_access(project_id) OR 
  client_has_project_access(auth.uid(), project_id)
);

CREATE POLICY "Clients can create their own approvals"
ON public.client_approvals FOR INSERT
WITH CHECK (
  user_id = auth.uid() AND client_has_project_access(auth.uid(), project_id)
);

CREATE POLICY "Clients can update their own approvals"
ON public.client_approvals FOR UPDATE
USING (user_id = auth.uid());

-- Enable realtime for comments
ALTER PUBLICATION supabase_realtime ADD TABLE public.client_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.client_approvals;