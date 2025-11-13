-- Add is_default_cover column to document_templates table
ALTER TABLE document_templates
ADD COLUMN is_default_cover boolean DEFAULT false;

-- Add index for faster queries
CREATE INDEX idx_document_templates_default_cover ON document_templates(is_default_cover) WHERE is_default_cover = true;

-- Create function to ensure only one default cover page template
CREATE OR REPLACE FUNCTION ensure_single_default_cover()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default_cover = true THEN
    -- Unset all other default cover page templates
    UPDATE document_templates
    SET is_default_cover = false
    WHERE is_default_cover = true
      AND id != NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to enforce single default
DROP TRIGGER IF EXISTS trigger_ensure_single_default_cover ON document_templates;
CREATE TRIGGER trigger_ensure_single_default_cover
  BEFORE INSERT OR UPDATE OF is_default_cover
  ON document_templates
  FOR EACH ROW
  WHEN (NEW.is_default_cover = true)
  EXECUTE FUNCTION ensure_single_default_cover();