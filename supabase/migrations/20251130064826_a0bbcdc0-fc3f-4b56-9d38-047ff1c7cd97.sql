-- Add more specific material sub-categories for electrical work
INSERT INTO material_categories (category_code, category_name, description, parent_category_id, sort_order, is_active)
VALUES 
  -- Containment sub-categories
  ('CT-TR', 'Cable Tray', 'Perforated and ladder type cable trays', '274a7484-0d8d-4f79-91d3-a74a84e3a65f', 1, true),
  ('CT-TK', 'Trunking', 'Metal and PVC cable trunking', '274a7484-0d8d-4f79-91d3-a74a84e3a65f', 2, true),
  ('CT-CD', 'Conduits', 'Steel and PVC conduits', '274a7484-0d8d-4f79-91d3-a74a84e3a65f', 3, true),
  ('CT-DB', 'Draw Boxes', 'Junction and draw boxes', '274a7484-0d8d-4f79-91d3-a74a84e3a65f', 4, true),
  -- Cable sub-categories  
  ('CB-CD', 'Conductors', 'Bare and insulated conductors', 'fbff42ba-7882-4a67-9d1d-2702f83a57e7', 3, true),
  ('CB-DT', 'Data Cables', 'CAT6, fibre optic and data cables', 'fbff42ba-7882-4a67-9d1d-2702f83a57e7', 4, true)
ON CONFLICT (category_code) DO NOTHING;