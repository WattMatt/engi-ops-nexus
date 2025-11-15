-- Add page_content_map column to cost_report_pdfs table
-- This will store JSON mapping page numbers to their text content for placeholder extraction

ALTER TABLE cost_report_pdfs 
ADD COLUMN IF NOT EXISTS page_content_map JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN cost_report_pdfs.page_content_map IS 'JSON object mapping page numbers to arrays of text content items with their positions';