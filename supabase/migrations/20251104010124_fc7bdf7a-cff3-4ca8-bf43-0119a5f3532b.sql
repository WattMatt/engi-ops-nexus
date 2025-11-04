-- Add revision field to generator_reports table
ALTER TABLE generator_reports
ADD COLUMN IF NOT EXISTS revision TEXT DEFAULT 'Rev.0';

-- Create index for faster revision lookups by project
CREATE INDEX IF NOT EXISTS idx_generator_reports_project_revision 
ON generator_reports(project_id, revision);