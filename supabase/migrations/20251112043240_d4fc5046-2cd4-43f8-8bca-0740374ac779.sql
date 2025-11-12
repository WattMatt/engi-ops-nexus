-- Add captured_components column to pdf_templates table
ALTER TABLE pdf_templates 
ADD COLUMN IF NOT EXISTS captured_components JSONB DEFAULT '[]'::jsonb;