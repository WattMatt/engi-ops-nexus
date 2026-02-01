-- Add report-specific configuration columns to report_automation_settings
ALTER TABLE report_automation_settings 
ADD COLUMN IF NOT EXISTS report_config JSONB DEFAULT '{}';

-- Add document_id for reports that require a specific document (e.g., cost report, cable schedule)
ALTER TABLE report_automation_settings 
ADD COLUMN IF NOT EXISTS document_id UUID;

-- Add contact_id for "Prepared For" selection
ALTER TABLE report_automation_settings 
ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES project_contacts(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_report_automation_settings_report_type 
ON report_automation_settings(report_type);

-- Add comment for documentation
COMMENT ON COLUMN report_automation_settings.report_config IS 'Report-specific configuration options as JSON (e.g., include_variations, include_voltage_analysis)';
COMMENT ON COLUMN report_automation_settings.document_id IS 'Reference to specific document for reports like cost_report or cable_schedule';
COMMENT ON COLUMN report_automation_settings.contact_id IS 'Contact to use for "Prepared For" field in report cover page';