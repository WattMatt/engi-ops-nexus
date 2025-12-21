-- Add socket sub-categories under Power Skirting and Power Poles
DO $$
DECLARE
  pwr_sk_id UUID;
  pwr_pl_id UUID;
  pwr_sk_sock_id UUID;
  pwr_pl_sock_id UUID;
BEGIN
  SELECT id INTO pwr_sk_id FROM material_categories WHERE category_code = 'PWR-SK';
  SELECT id INTO pwr_pl_id FROM material_categories WHERE category_code = 'PWR-PL';

  -- Add Sockets sub-category under Power Skirting
  INSERT INTO material_categories (category_code, category_name, description, parent_category_id, sort_order, is_active)
  VALUES ('PWR-SK-SOCK', 'Power Skirting Sockets', 'Socket outlets installed in power skirting systems', pwr_sk_id, 3, true)
  ON CONFLICT (category_code) DO UPDATE SET parent_category_id = pwr_sk_id
  RETURNING id INTO pwr_sk_sock_id;

  IF pwr_sk_sock_id IS NULL THEN
    SELECT id INTO pwr_sk_sock_id FROM material_categories WHERE category_code = 'PWR-SK-SOCK';
  END IF;

  -- Add Sockets sub-category under Power Poles  
  INSERT INTO material_categories (category_code, category_name, description, parent_category_id, sort_order, is_active)
  VALUES ('PWR-PL-SOCK', 'Power Pole Sockets', 'Socket outlets and modules for power poles', pwr_pl_id, 3, true)
  ON CONFLICT (category_code) DO UPDATE SET parent_category_id = pwr_pl_id
  RETURNING id INTO pwr_pl_sock_id;

  IF pwr_pl_sock_id IS NULL THEN
    SELECT id INTO pwr_pl_sock_id FROM material_categories WHERE category_code = 'PWR-PL-SOCK';
  END IF;

  -- Insert Power Skirting socket materials
  INSERT INTO master_materials (material_code, material_name, description, category_id, unit, standard_supply_cost, standard_install_cost, effective_from, is_active)
  VALUES 
    ('PWR-SK-SOCK-1G', 'Single Socket Module', 'Single 13A socket outlet module for power skirting', pwr_sk_sock_id, 'each', 95.00, 25.00, CURRENT_DATE, true),
    ('PWR-SK-SOCK-2G', 'Double Socket Module', 'Double 13A socket outlet module for power skirting', pwr_sk_sock_id, 'each', 145.00, 30.00, CURRENT_DATE, true),
    ('PWR-SK-SOCK-USB', 'Socket with USB Module', 'Double 13A socket with USB charging for power skirting', pwr_sk_sock_id, 'each', 195.00, 30.00, CURRENT_DATE, true),
    ('PWR-SK-DATA-1G', 'Single Data Module', 'Single RJ45 data outlet module for power skirting', pwr_sk_sock_id, 'each', 85.00, 25.00, CURRENT_DATE, true),
    ('PWR-SK-DATA-2G', 'Double Data Module', 'Double RJ45 data outlet module for power skirting', pwr_sk_sock_id, 'each', 125.00, 30.00, CURRENT_DATE, true),
    ('PWR-SK-BLANK', 'Blank Module', 'Blank cover plate module for power skirting', pwr_sk_sock_id, 'each', 25.00, 10.00, CURRENT_DATE, true)
  ON CONFLICT (material_code) DO NOTHING;

  -- Insert Power Pole socket materials
  INSERT INTO master_materials (material_code, material_name, description, category_id, unit, standard_supply_cost, standard_install_cost, effective_from, is_active)
  VALUES 
    ('PWR-PL-SOCK-1G', 'Single Socket Module', 'Single 13A socket outlet module for power pole', pwr_pl_sock_id, 'each', 115.00, 35.00, CURRENT_DATE, true),
    ('PWR-PL-SOCK-2G', 'Double Socket Module', 'Double 13A socket outlet module for power pole', pwr_pl_sock_id, 'each', 175.00, 40.00, CURRENT_DATE, true),
    ('PWR-PL-SOCK-USB', 'Socket with USB Module', 'Double 13A socket with USB charging for power pole', pwr_pl_sock_id, 'each', 235.00, 40.00, CURRENT_DATE, true),
    ('PWR-PL-DATA-1G', 'Single Data Module', 'Single RJ45 data outlet module for power pole', pwr_pl_sock_id, 'each', 95.00, 35.00, CURRENT_DATE, true),
    ('PWR-PL-DATA-2G', 'Double Data Module', 'Double RJ45 data outlet module for power pole', pwr_pl_sock_id, 'each', 145.00, 40.00, CURRENT_DATE, true),
    ('PWR-PL-BLANK', 'Blank Module', 'Blank cover plate module for power pole', pwr_pl_sock_id, 'each', 35.00, 15.00, CURRENT_DATE, true),
    ('PWR-PL-SWITCH', 'Switch Module', 'Isolator switch module for power pole', pwr_pl_sock_id, 'each', 85.00, 35.00, CURRENT_DATE, true)
  ON CONFLICT (material_code) DO NOTHING;

END $$;

-- Update description for general sockets category to clarify wall-mounted
UPDATE material_categories 
SET description = 'Socket outlets for wall installation (flush or surface mounted)'
WHERE category_code = 'SOCK';