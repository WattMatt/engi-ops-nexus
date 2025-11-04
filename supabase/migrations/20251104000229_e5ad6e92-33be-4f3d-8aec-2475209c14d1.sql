-- Create report_settings table to store user/project formatting preferences
CREATE TABLE public.report_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  
  -- Document Structure
  include_cover_page BOOLEAN DEFAULT true,
  cover_layout JSONB DEFAULT '{"style": "modern", "elements": []}',
  sections_order JSONB DEFAULT '[]',
  
  -- Styling and Appearance
  font_family TEXT DEFAULT 'Helvetica',
  font_size INTEGER DEFAULT 10,
  primary_color TEXT DEFAULT '#1e40af',
  secondary_color TEXT DEFAULT '#64748b',
  header_style JSONB DEFAULT '{"fontSize": 12, "bold": true, "color": "#1e40af"}',
  footer_style JSONB DEFAULT '{"fontSize": 9, "color": "#64748b"}',
  table_style JSONB DEFAULT '{"headerBg": "#1e40af", "headerColor": "#ffffff", "cellPadding": 3, "borderWidth": 0.5}',
  
  -- Layout Control
  margins JSONB DEFAULT '{"top": 20, "bottom": 20, "left": 15, "right": 15}',
  line_spacing DECIMAL DEFAULT 1.15,
  paragraph_spacing DECIMAL DEFAULT 6,
  page_orientation TEXT DEFAULT 'portrait' CHECK (page_orientation IN ('portrait', 'landscape')),
  
  -- Visual Enhancements
  company_logo_url TEXT,
  watermark_text TEXT,
  watermark_opacity DECIMAL DEFAULT 0.1,
  background_pattern TEXT,
  
  -- Metadata and Branding
  company_name TEXT,
  company_tagline TEXT,
  company_contact JSONB DEFAULT '{}',
  author_name TEXT,
  show_page_numbers BOOLEAN DEFAULT true,
  show_date BOOLEAN DEFAULT true,
  
  -- Template Info
  is_template BOOLEAN DEFAULT false,
  template_name TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create report_templates table for saved formatting configurations
CREATE TABLE public.report_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_name TEXT NOT NULL,
  description TEXT,
  report_type TEXT, -- 'generator', 'cable_schedule', 'cost_report', 'all'
  
  -- Store complete formatting configuration
  config JSONB NOT NULL,
  
  -- Template metadata
  is_default BOOLEAN DEFAULT false,
  is_public BOOLEAN DEFAULT false,
  usage_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.report_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for report_settings
CREATE POLICY "Users can view their own report settings"
  ON public.report_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own report settings"
  ON public.report_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own report settings"
  ON public.report_settings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own report settings"
  ON public.report_settings FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for report_templates
CREATE POLICY "Users can view their own templates and public templates"
  ON public.report_templates FOR SELECT
  USING (auth.uid() = user_id OR is_public = true);

CREATE POLICY "Users can create their own templates"
  ON public.report_templates FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own templates"
  ON public.report_templates FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own templates"
  ON public.report_templates FOR DELETE
  USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_report_settings_user_id ON public.report_settings(user_id);
CREATE INDEX idx_report_settings_project_id ON public.report_settings(project_id);
CREATE INDEX idx_report_templates_user_id ON public.report_templates(user_id);
CREATE INDEX idx_report_templates_report_type ON public.report_templates(report_type);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_report_settings_updated_at
  BEFORE UPDATE ON public.report_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_report_templates_updated_at
  BEFORE UPDATE ON public.report_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();