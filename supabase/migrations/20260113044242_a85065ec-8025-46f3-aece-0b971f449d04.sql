-- Email Senders Table
CREATE TABLE public.email_senders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email_prefix TEXT NOT NULL,
  domain TEXT NOT NULL DEFAULT 'watsonmattheus.com',
  full_email TEXT GENERATED ALWAYS AS (email_prefix || '@' || domain) STORED,
  display_name TEXT NOT NULL,
  is_predefined BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  description TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(email_prefix, domain)
);

-- Email Template Categories
CREATE TABLE public.email_template_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Email Templates Table
CREATE TABLE public.email_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category_id UUID REFERENCES public.email_template_categories(id),
  sender_id UUID REFERENCES public.email_senders(id),
  subject_template TEXT NOT NULL,
  html_content TEXT NOT NULL,
  json_content JSONB, -- For drag-and-drop builder state
  plain_text_content TEXT,
  variables JSONB DEFAULT '[]'::jsonb, -- Available template variables
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_default BOOLEAN NOT NULL DEFAULT false,
  version INTEGER NOT NULL DEFAULT 1,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Template Versions for history/rollback
CREATE TABLE public.email_template_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES public.email_templates(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  subject_template TEXT NOT NULL,
  html_content TEXT NOT NULL,
  json_content JSONB,
  variables JSONB,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT
);

-- A/B Test Variants
CREATE TABLE public.email_template_variants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES public.email_templates(id) ON DELETE CASCADE,
  variant_name TEXT NOT NULL DEFAULT 'Variant B',
  subject_template TEXT NOT NULL,
  html_content TEXT NOT NULL,
  json_content JSONB,
  weight INTEGER NOT NULL DEFAULT 50 CHECK (weight >= 0 AND weight <= 100),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Template Usage Analytics
CREATE TABLE public.email_template_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES public.email_templates(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES public.email_template_variants(id) ON DELETE SET NULL,
  sent_count INTEGER NOT NULL DEFAULT 0,
  delivered_count INTEGER NOT NULL DEFAULT 0,
  opened_count INTEGER NOT NULL DEFAULT 0,
  clicked_count INTEGER NOT NULL DEFAULT 0,
  bounced_count INTEGER NOT NULL DEFAULT 0,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(template_id, variant_id, date)
);

-- AI Personalization Suggestions
CREATE TABLE public.email_ai_suggestions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID REFERENCES public.email_templates(id) ON DELETE CASCADE,
  suggestion_type TEXT NOT NULL, -- 'subject', 'content', 'timing', 'audience'
  original_text TEXT,
  suggested_text TEXT NOT NULL,
  confidence_score NUMERIC(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
  reasoning TEXT,
  is_applied BOOLEAN NOT NULL DEFAULT false,
  applied_by UUID REFERENCES auth.users(id),
  applied_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.email_senders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_template_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_template_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_template_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_template_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_ai_suggestions ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Admins can manage all, others can view active
CREATE POLICY "Admins can manage email senders" ON public.email_senders
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Users can view active senders" ON public.email_senders
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage template categories" ON public.email_template_categories
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Users can view template categories" ON public.email_template_categories
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage email templates" ON public.email_templates
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Users can view active templates" ON public.email_templates
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage template versions" ON public.email_template_versions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can manage template variants" ON public.email_template_variants
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can manage template analytics" ON public.email_template_analytics
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can manage AI suggestions" ON public.email_ai_suggestions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Insert predefined senders
INSERT INTO public.email_senders (name, email_prefix, display_name, is_predefined, description) VALUES
  ('No Reply', 'noreply', 'Watson Mattheus', true, 'Default sender for automated notifications'),
  ('System', 'system', 'Watson Mattheus System', true, 'System alerts and critical notifications'),
  ('Notifications', 'notifications', 'Watson Mattheus Notifications', true, 'General notification emails'),
  ('Support', 'support', 'Watson Mattheus Support', true, 'Support and help desk emails');

-- Insert default template categories
INSERT INTO public.email_template_categories (name, description, icon, display_order) VALUES
  ('Notifications', 'Message notifications, mentions, and alerts', 'Bell', 1),
  ('Item Sharing', 'When documents, files, or projects are shared', 'Share2', 2),
  ('Project Updates', 'Project status changes and milestones', 'FolderKanban', 3),
  ('Review & Approval', 'Approval requests and review status updates', 'CheckCircle', 4),
  ('User Onboarding', 'Welcome emails and account setup', 'UserPlus', 5),
  ('Account', 'Password resets, security alerts, settings changes', 'Shield', 6);

-- Create trigger for updated_at
CREATE TRIGGER update_email_senders_updated_at
  BEFORE UPDATE ON public.email_senders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_email_templates_updated_at
  BEFORE UPDATE ON public.email_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_email_template_variants_updated_at
  BEFORE UPDATE ON public.email_template_variants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();