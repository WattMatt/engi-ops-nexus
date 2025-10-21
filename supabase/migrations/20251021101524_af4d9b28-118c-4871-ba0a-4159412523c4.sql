-- Create table for cost report details sections
CREATE TABLE IF NOT EXISTS public.cost_report_details (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cost_report_id UUID NOT NULL REFERENCES public.cost_reports(id) ON DELETE CASCADE,
  section_number INTEGER NOT NULL,
  section_title TEXT NOT NULL,
  section_content TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.cost_report_details ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view report details for their projects"
ON public.cost_report_details
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM cost_reports cr
    JOIN project_members pm ON pm.project_id = cr.project_id
    WHERE cr.id = cost_report_details.cost_report_id
    AND pm.user_id = auth.uid()
  )
);

CREATE POLICY "Users can manage report details for their projects"
ON public.cost_report_details
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM cost_reports cr
    JOIN project_members pm ON pm.project_id = cr.project_id
    WHERE cr.id = cost_report_details.cost_report_id
    AND pm.user_id = auth.uid()
  )
);

-- Create updated_at trigger
CREATE TRIGGER update_cost_report_details_updated_at
BEFORE UPDATE ON public.cost_report_details
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();