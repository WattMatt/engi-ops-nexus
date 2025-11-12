-- Create PDF style templates table
CREATE TABLE IF NOT EXISTS public.pdf_style_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  report_type TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  settings JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.pdf_style_templates ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view templates in their organization"
  ON public.pdf_style_templates
  FOR SELECT
  USING (true);

CREATE POLICY "Users can create templates"
  ON public.pdf_style_templates
  FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own templates"
  ON public.pdf_style_templates
  FOR UPDATE
  USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own templates"
  ON public.pdf_style_templates
  FOR DELETE
  USING (auth.uid() = created_by);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.update_pdf_template_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_pdf_template_timestamp
  BEFORE UPDATE ON public.pdf_style_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_pdf_template_updated_at();

-- Insert default template for cost reports
INSERT INTO public.pdf_style_templates (name, description, report_type, is_default, settings)
VALUES (
  'Professional Default',
  'Clean professional styling with minimal colors',
  'cost_report',
  true,
  '{
    "typography": {
      "headingFont": "helvetica",
      "bodyFont": "helvetica",
      "h1Size": 18,
      "h2Size": 14,
      "h3Size": 12,
      "bodySize": 10,
      "smallSize": 8
    },
    "colors": {
      "primary": [0, 0, 0],
      "secondary": [60, 60, 60],
      "accent": [41, 128, 185],
      "text": [40, 40, 40],
      "neutral": [200, 200, 200],
      "success": [39, 174, 96],
      "danger": [231, 76, 60],
      "warning": [243, 156, 18],
      "white": [255, 255, 255]
    },
    "spacing": {
      "lineSpacing": 1.2,
      "paragraphSpacing": 5,
      "sectionSpacing": 15
    },
    "tables": {
      "headerBg": [245, 245, 245],
      "headerText": [0, 0, 0],
      "alternateRowBg": [250, 250, 250],
      "borderColor": [200, 200, 200],
      "fontSize": 9,
      "cellPadding": 3,
      "showGridLines": true
    },
    "layout": {
      "margins": {
        "top": 20,
        "bottom": 20,
        "left": 20,
        "right": 20
      }
    }
  }'::jsonb
);