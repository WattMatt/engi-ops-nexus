-- Create report_drafts table for storing interactive report editor drafts
CREATE TABLE public.report_drafts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  report_type TEXT NOT NULL,
  content JSONB NOT NULL DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.report_drafts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view drafts for their projects"
  ON public.report_drafts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.project_members
      WHERE project_members.project_id = report_drafts.project_id
      AND project_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create drafts for their projects"
  ON public.report_drafts FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.project_members
      WHERE project_members.project_id = report_drafts.project_id
      AND project_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their project drafts"
  ON public.report_drafts FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.project_members
      WHERE project_members.project_id = report_drafts.project_id
      AND project_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their project drafts"
  ON public.report_drafts FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.project_members
      WHERE project_members.project_id = report_drafts.project_id
      AND project_members.user_id = auth.uid()
    )
  );

-- Create index
CREATE INDEX idx_report_drafts_project_id ON public.report_drafts(project_id);
CREATE INDEX idx_report_drafts_report_type ON public.report_drafts(report_type);

-- Trigger for updated_at
CREATE TRIGGER update_report_drafts_updated_at
  BEFORE UPDATE ON public.report_drafts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();