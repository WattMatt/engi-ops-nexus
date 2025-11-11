-- Add project_description and client_representative columns to bulk_services_documents table
ALTER TABLE bulk_services_documents 
  ADD COLUMN IF NOT EXISTS project_description TEXT,
  ADD COLUMN IF NOT EXISTS client_representative TEXT;

COMMENT ON COLUMN bulk_services_documents.project_description IS 'Description of the project';
COMMENT ON COLUMN bulk_services_documents.client_representative IS 'Client representative contact person';