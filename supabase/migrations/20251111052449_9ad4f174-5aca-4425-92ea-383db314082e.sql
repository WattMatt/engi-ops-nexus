-- Add drawing markup columns to bulk_services_documents table
ALTER TABLE bulk_services_documents 
ADD COLUMN IF NOT EXISTS drawing_file_path TEXT,
ADD COLUMN IF NOT EXISTS drawing_markup_data JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS ai_guidance_parameters JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN bulk_services_documents.drawing_file_path IS 'Storage path for uploaded drawing PDF';
COMMENT ON COLUMN bulk_services_documents.drawing_markup_data IS 'Markup data including connection points, transformers, routes';
COMMENT ON COLUMN bulk_services_documents.ai_guidance_parameters IS 'Parameters to guide AI section generation';