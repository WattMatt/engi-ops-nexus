-- Add Floor Boxes parent category and sub-categories
DO $$
DECLARE
  flr_box_id UUID;
  flr_box_type_id UUID;
  flr_box_sock_id UUID;
  flr_box_acc_id UUID;
BEGIN
  -- Create parent Floor Boxes category
  INSERT INTO material_categories (category_code, category_name, description, sort_order, is_active)
  VALUES ('FLR-BOX', 'Floor Boxes', 'Floor boxes and floor outlet systems', 22, true)
  ON CONFLICT (category_code) DO NOTHING;

  SELECT id INTO flr_box_id FROM material_categories WHERE category_code = 'FLR-BOX';

  -- Sub-categories under Floor Boxes
  INSERT INTO material_categories (category_code, category_name, description, parent_category_id, sort_order, is_active)
  VALUES 
    ('FLR-BOX-STD', 'Standard Floor Boxes', 'Standard flush floor boxes for raised floors and screed', flr_box_id, 1, true),
    ('FLR-BOX-HD', 'Heavy Duty Floor Boxes', 'Heavy duty floor boxes for high traffic areas', flr_box_id, 2, true),
    ('FLR-BOX-SOCK', 'Floor Box Sockets', 'Socket outlet modules for floor boxes', flr_box_id, 3, true),
    ('FLR-BOX-ACC', 'Floor Box Accessories', 'Lids, frames, and accessories for floor boxes', flr_box_id, 4, true)
  ON CONFLICT (category_code) DO UPDATE SET parent_category_id = flr_box_id;

  SELECT id INTO flr_box_type_id FROM material_categories WHERE category_code = 'FLR-BOX-STD';
  SELECT id INTO flr_box_sock_id FROM material_categories WHERE category_code = 'FLR-BOX-SOCK';
  SELECT id INTO flr_box_acc_id FROM material_categories WHERE category_code = 'FLR-BOX-ACC';

  -- Insert Standard Floor Box materials
  INSERT INTO master_materials (material_code, material_name, description, category_id, unit, standard_supply_cost, standard_install_cost, effective_from, is_active)
  VALUES 
    ('FLR-BOX-2G', '2 Gang Floor Box', 'Standard 2 gang floor box with brass lid', flr_box_type_id, 'each', 450.00, 185.00, CURRENT_DATE, true),
    ('FLR-BOX-3G', '3 Gang Floor Box', 'Standard 3 gang floor box with brass lid', flr_box_type_id, 'each', 550.00, 195.00, CURRENT_DATE, true),
    ('FLR-BOX-4G', '4 Gang Floor Box', 'Standard 4 gang floor box with brass lid', flr_box_type_id, 'each', 680.00, 215.00, CURRENT_DATE, true),
    ('FLR-BOX-6G', '6 Gang Floor Box', 'Standard 6 gang floor box with brass lid', flr_box_type_id, 'each', 850.00, 245.00, CURRENT_DATE, true)
  ON CONFLICT (material_code) DO NOTHING;

  -- Insert Heavy Duty Floor Box materials  
  INSERT INTO master_materials (material_code, material_name, description, category_id, unit, standard_supply_cost, standard_install_cost, effective_from, is_active)
  SELECT code, name, description, 
    (SELECT id FROM material_categories WHERE category_code = 'FLR-BOX-HD'),
    'each', supply, install, CURRENT_DATE, true
  FROM (VALUES
    ('FLR-BOX-HD-2G', '2 Gang HD Floor Box', 'Heavy duty 2 gang floor box - stainless steel lid', 650.00, 225.00),
    ('FLR-BOX-HD-4G', '4 Gang HD Floor Box', 'Heavy duty 4 gang floor box - stainless steel lid', 950.00, 275.00),
    ('FLR-BOX-HD-6G', '6 Gang HD Floor Box', 'Heavy duty 6 gang floor box - stainless steel lid', 1250.00, 325.00)
  ) AS t(code, name, description, supply, install)
  ON CONFLICT (material_code) DO NOTHING;

  -- Insert Floor Box Socket materials
  INSERT INTO master_materials (material_code, material_name, description, category_id, unit, standard_supply_cost, standard_install_cost, effective_from, is_active)
  VALUES 
    ('FLR-BOX-SOCK-1G', 'Single Socket Module', 'Single 13A socket outlet module for floor box', flr_box_sock_id, 'each', 85.00, 25.00, CURRENT_DATE, true),
    ('FLR-BOX-SOCK-2G', 'Double Socket Module', 'Double 13A socket outlet module for floor box', flr_box_sock_id, 'each', 135.00, 30.00, CURRENT_DATE, true),
    ('FLR-BOX-SOCK-16A', '16A Socket Module', '16A industrial socket outlet module for floor box', flr_box_sock_id, 'each', 185.00, 35.00, CURRENT_DATE, true),
    ('FLR-BOX-SOCK-USB', 'Socket with USB Module', 'Double 13A socket with USB charging for floor box', flr_box_sock_id, 'each', 195.00, 30.00, CURRENT_DATE, true),
    ('FLR-BOX-DATA-1G', 'Single Data Module', 'Single RJ45 data outlet module for floor box', flr_box_sock_id, 'each', 75.00, 25.00, CURRENT_DATE, true),
    ('FLR-BOX-DATA-2G', 'Double Data Module', 'Double RJ45 data outlet module for floor box', flr_box_sock_id, 'each', 115.00, 30.00, CURRENT_DATE, true),
    ('FLR-BOX-HDMI', 'HDMI Module', 'HDMI outlet module for floor box', flr_box_sock_id, 'each', 145.00, 35.00, CURRENT_DATE, true),
    ('FLR-BOX-BLANK', 'Blank Module', 'Blank cover plate module for floor box', flr_box_sock_id, 'each', 25.00, 10.00, CURRENT_DATE, true)
  ON CONFLICT (material_code) DO NOTHING;

  -- Insert Floor Box Accessories
  INSERT INTO master_materials (material_code, material_name, description, category_id, unit, standard_supply_cost, standard_install_cost, effective_from, is_active)
  VALUES 
    ('FLR-BOX-LID-BR', 'Brass Lid', 'Replacement brass lid for floor box', flr_box_acc_id, 'each', 185.00, 25.00, CURRENT_DATE, true),
    ('FLR-BOX-LID-SS', 'Stainless Steel Lid', 'Replacement stainless steel lid for floor box', flr_box_acc_id, 'each', 285.00, 25.00, CURRENT_DATE, true),
    ('FLR-BOX-LID-ALU', 'Aluminium Lid', 'Replacement aluminium lid for floor box', flr_box_acc_id, 'each', 145.00, 25.00, CURRENT_DATE, true),
    ('FLR-BOX-FRAME', 'Carpet Trim Frame', 'Carpet trim frame for floor box', flr_box_acc_id, 'each', 95.00, 35.00, CURRENT_DATE, true),
    ('FLR-BOX-GASKET', 'Waterproof Gasket', 'Waterproof gasket seal for floor box', flr_box_acc_id, 'each', 45.00, 15.00, CURRENT_DATE, true)
  ON CONFLICT (material_code) DO NOTHING;

END $$;