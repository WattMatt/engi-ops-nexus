-- Seed default contact categories into the database
-- These will be the "system" categories that cannot be deleted

INSERT INTO public.contact_categories (value, label, is_custom)
VALUES
  ('supply_authority', 'Supply Authority', false),
  ('client', 'Client', false),
  ('architect', 'Architect', false),
  ('mechanical', 'Mechanical', false),
  ('fire', 'Fire', false),
  ('structural', 'Structural', false),
  ('civil', 'Civil', false),
  ('wet_services', 'Wet Services', false),
  ('tenant_coordinator', 'Tenant Coordinator', false),
  ('safety', 'Safety', false),
  ('landscaping', 'Landscaping', false),
  ('quantity_surveyor', 'Quantity Surveyor', false),
  ('contractor', 'Contractor', false),
  ('engineer', 'Engineer', false),
  ('consultant', 'Consultant', false)
ON CONFLICT (value) DO NOTHING;