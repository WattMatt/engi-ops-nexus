-- Create lighting_analysis_settings table for project-level analysis settings
CREATE TABLE public.lighting_analysis_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE UNIQUE,
  electricity_rate NUMERIC DEFAULT 2.40,
  operating_hours_per_day NUMERIC DEFAULT 10,
  analysis_period_years INTEGER DEFAULT 5,
  include_vat BOOLEAN DEFAULT true,
  vat_rate NUMERIC DEFAULT 15,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.lighting_analysis_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view lighting analysis settings" ON public.lighting_analysis_settings FOR SELECT USING (true);
CREATE POLICY "Users can create lighting analysis settings" ON public.lighting_analysis_settings FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update lighting analysis settings" ON public.lighting_analysis_settings FOR UPDATE USING (true);
CREATE POLICY "Users can delete lighting analysis settings" ON public.lighting_analysis_settings FOR DELETE USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_lighting_analysis_settings_updated_at
  BEFORE UPDATE ON public.lighting_analysis_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();