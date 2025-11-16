-- Migrate data from cover_page_templates to document_templates
INSERT INTO document_templates (
  id,
  name,
  file_name,
  file_url,
  template_type,
  is_active,
  is_default_cover,
  created_at,
  updated_at,
  created_by
)
SELECT 
  id,
  name,
  substring(file_path from '[^/]+$') as file_name,
  file_path as file_url,
  'cover_page' as template_type,
  true as is_active,
  is_default as is_default_cover,
  created_at,
  updated_at,
  created_by
FROM cover_page_templates
WHERE NOT EXISTS (
  SELECT 1 FROM document_templates dt WHERE dt.id = cover_page_templates.id
);

-- Drop the old cover_page_templates table
DROP TABLE IF EXISTS cover_page_templates;