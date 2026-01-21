-- Add document_tabs column to client_portal_tokens table
ALTER TABLE public.client_portal_tokens
ADD COLUMN document_tabs TEXT[] DEFAULT ARRAY['overview', 'as_built', 'generators', 'transformers', 'main_boards', 'lighting', 'cctv_access_control', 'lightning_protection', 'specifications', 'test_certificates', 'warranties', 'manuals', 'commissioning_docs', 'compliance_certs'];

-- Add comment explaining the column
COMMENT ON COLUMN public.client_portal_tokens.document_tabs IS 'Array of document tab keys that this token grants access to';