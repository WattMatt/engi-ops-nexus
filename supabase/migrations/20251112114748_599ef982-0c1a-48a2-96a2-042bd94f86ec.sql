-- Update default template to include grid settings
UPDATE public.pdf_style_templates
SET settings = jsonb_set(
  settings,
  '{grid}',
  '{"size": 10, "enabled": true, "visible": true}'::jsonb
)
WHERE report_type = 'cost_report' AND is_default = true;