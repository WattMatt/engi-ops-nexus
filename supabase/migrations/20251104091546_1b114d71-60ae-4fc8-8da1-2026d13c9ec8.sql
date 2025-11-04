-- Add support for multiple attachments and additional context to issue reports
ALTER TABLE issue_reports 
ADD COLUMN IF NOT EXISTS attachments jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS console_logs text,
ADD COLUMN IF NOT EXISTS additional_context text;

-- Add comment for documentation
COMMENT ON COLUMN issue_reports.attachments IS 'Array of attachment objects with url, filename, and type';
COMMENT ON COLUMN issue_reports.console_logs IS 'Console logs or error messages provided by user';
COMMENT ON COLUMN issue_reports.additional_context IS 'Additional context or data points provided by user';

-- Add support for multiple attachments to suggestions table
ALTER TABLE suggestions 
ADD COLUMN IF NOT EXISTS attachments jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS console_logs text,
ADD COLUMN IF NOT EXISTS additional_context text;

COMMENT ON COLUMN suggestions.attachments IS 'Array of attachment objects with url, filename, and type';
COMMENT ON COLUMN suggestions.console_logs IS 'Console logs or error messages provided by user';
COMMENT ON COLUMN suggestions.additional_context IS 'Additional context or data points provided by user';