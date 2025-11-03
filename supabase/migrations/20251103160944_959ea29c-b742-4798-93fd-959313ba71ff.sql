-- Create table to track generator reports metadata
CREATE TABLE IF NOT EXISTS generator_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  report_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  generated_by UUID REFERENCES auth.users(id),
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on generator_reports
ALTER TABLE generator_reports ENABLE ROW LEVEL SECURITY;

-- Create policies for generator_reports table
CREATE POLICY "Users can view reports for their projects"
ON generator_reports FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM project_members
    WHERE project_members.project_id = generator_reports.project_id
    AND project_members.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create reports for their projects"
ON generator_reports FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM project_members
    WHERE project_members.project_id = generator_reports.project_id
    AND project_members.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete reports for their projects"
ON generator_reports FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM project_members
    WHERE project_members.project_id = generator_reports.project_id
    AND project_members.user_id = auth.uid()
  )
);

-- Create index for faster lookups
CREATE INDEX idx_generator_reports_project ON generator_reports(project_id);
CREATE INDEX idx_generator_reports_generated_at ON generator_reports(generated_at DESC);