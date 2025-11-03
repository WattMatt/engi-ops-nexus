-- Create table for floor plan exported PDF reports
CREATE TABLE public.floor_plan_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  project_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  report_revision INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  comments TEXT
);

-- Enable RLS
ALTER TABLE public.floor_plan_reports ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own floor plan reports" 
ON public.floor_plan_reports 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own floor plan reports" 
ON public.floor_plan_reports 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own floor plan reports" 
ON public.floor_plan_reports 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create storage bucket for floor plan reports
INSERT INTO storage.buckets (id, name, public) 
VALUES ('floor-plan-reports', 'floor-plan-reports', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for floor plan reports
CREATE POLICY "Users can view their own floor plan reports" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'floor-plan-reports' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own floor plan reports" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'floor-plan-reports' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own floor plan reports" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'floor-plan-reports' AND auth.uid()::text = (storage.foldername(name))[1]);