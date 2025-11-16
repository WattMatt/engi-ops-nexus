
-- Add preview PDF URL column to document_templates table
ALTER TABLE document_templates 
ADD COLUMN IF NOT EXISTS preview_pdf_url TEXT;

-- Add comment for documentation
COMMENT ON COLUMN document_templates.preview_pdf_url IS 'URL of the PDF preview showing the template with placeholders filled in';
