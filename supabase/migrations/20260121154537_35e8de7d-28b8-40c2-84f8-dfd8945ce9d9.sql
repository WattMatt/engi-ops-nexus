-- Add document tab permissions to client_report_permissions table
-- We'll use a JSONB column to store allowed document categories
ALTER TABLE public.client_report_permissions 
ADD COLUMN IF NOT EXISTS document_tabs TEXT[] DEFAULT ARRAY['overview', 'as_built', 'generators', 'transformers', 'main_boards', 'lighting', 'cctv_access_control', 'lightning_protection', 'specifications', 'test_certificates', 'warranties', 'manuals', 'commissioning_docs', 'compliance_certs'];

-- Add comment for documentation
COMMENT ON COLUMN public.client_report_permissions.document_tabs IS 'Array of document category keys that the client can access in the documents page';