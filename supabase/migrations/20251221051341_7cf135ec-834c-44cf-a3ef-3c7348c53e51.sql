-- Add missing parent categories for common electrical items
INSERT INTO material_categories (category_code, category_name, description, sort_order, is_active)
VALUES 
  ('COND', 'Conductors', 'Copper and aluminium conductors for wiring systems', 5, true),
  ('ISO', 'Isolators', 'Electrical isolators and switches for circuit isolation', 15, true),
  ('PWR-SK', 'Power Skirting', 'Power skirting and dado trunking systems', 20, true),
  ('PWR-PL', 'Power Poles', 'Power poles and desk power units', 25, true),
  ('SOCK', 'Sockets & Outlets', 'Socket outlets and power points', 30, true)
ON CONFLICT (category_code) DO NOTHING;

-- Get parent IDs for sub-categories
DO $$
DECLARE
  cond_id UUID;
  iso_id UUID;
  pwr_sk_id UUID;
  pwr_pl_id UUID;
  sock_id UUID;
  ap_id UUID;
BEGIN
  SELECT id INTO cond_id FROM material_categories WHERE category_code = 'COND';
  SELECT id INTO iso_id FROM material_categories WHERE category_code = 'ISO';
  SELECT id INTO pwr_sk_id FROM material_categories WHERE category_code = 'PWR-SK';
  SELECT id INTO pwr_pl_id FROM material_categories WHERE category_code = 'PWR-PL';
  SELECT id INTO sock_id FROM material_categories WHERE category_code = 'SOCK';
  SELECT id INTO ap_id FROM material_categories WHERE category_code = 'AP';

  -- Conductor sub-categories
  INSERT INTO material_categories (category_code, category_name, description, parent_category_id, sort_order, is_active)
  VALUES 
    ('COND-1.5', '1.5mm² Conductors', 'Single core 1.5mm² copper conductors', cond_id, 1, true),
    ('COND-2.5', '2.5mm² Conductors', 'Single core 2.5mm² copper conductors', cond_id, 2, true),
    ('COND-4', '4mm² Conductors', 'Single core 4mm² copper conductors', cond_id, 3, true),
    ('COND-6', '6mm² Conductors', 'Single core 6mm² copper conductors', cond_id, 4, true),
    ('COND-10', '10mm² Conductors', 'Single core 10mm² copper conductors', cond_id, 5, true),
    ('COND-16', '16mm² Conductors', 'Single core 16mm² copper conductors', cond_id, 6, true)
  ON CONFLICT (category_code) DO NOTHING;

  -- Isolator sub-categories
  INSERT INTO material_categories (category_code, category_name, description, parent_category_id, sort_order, is_active)
  VALUES 
    ('ISO-1P', 'Single Phase Isolators', 'Single phase isolators and switches', iso_id, 1, true),
    ('ISO-3P', 'Three Phase Isolators', 'Three phase isolators and switches', iso_id, 2, true),
    ('ISO-ROT', 'Rotary Isolators', 'Rotary type isolators for motor circuits', iso_id, 3, true)
  ON CONFLICT (category_code) DO NOTHING;

  -- Socket sub-categories  
  INSERT INTO material_categories (category_code, category_name, description, parent_category_id, sort_order, is_active)
  VALUES 
    ('SOCK-13A', '13A Socket Outlets', '13A BS1363 socket outlets', sock_id, 1, true),
    ('SOCK-16A', '16A Socket Outlets', '16A industrial socket outlets', sock_id, 2, true),
    ('SOCK-32A', '32A Socket Outlets', '32A industrial socket outlets', sock_id, 3, true),
    ('SOCK-DATA', 'Data Outlets', 'Data and network outlets', sock_id, 4, true),
    ('SOCK-USB', 'USB Outlets', 'Socket outlets with USB charging', sock_id, 5, true)
  ON CONFLICT (category_code) DO NOTHING;

  -- Power Skirting sub-categories
  INSERT INTO material_categories (category_code, category_name, description, parent_category_id, sort_order, is_active)
  VALUES 
    ('PWR-SK-3C', '3 Compartment Skirting', '3 compartment power skirting systems', pwr_sk_id, 1, true),
    ('PWR-SK-ACC', 'Skirting Accessories', 'Corners, joints and accessories for power skirting', pwr_sk_id, 2, true)
  ON CONFLICT (category_code) DO NOTHING;

  -- Power Pole sub-categories
  INSERT INTO material_categories (category_code, category_name, description, parent_category_id, sort_order, is_active)
  VALUES 
    ('PWR-PL-STD', 'Standard Power Poles', 'Standard power poles for office environments', pwr_pl_id, 1, true),
    ('PWR-PL-ADJ', 'Adjustable Power Poles', 'Height adjustable power poles', pwr_pl_id, 2, true)
  ON CONFLICT (category_code) DO NOTHING;

  -- Appliance sub-categories (if AP exists)
  IF ap_id IS NOT NULL THEN
    INSERT INTO material_categories (category_code, category_name, description, parent_category_id, sort_order, is_active)
    VALUES 
      ('AP-GEYSER', 'Geysers', 'Electric water heaters and geysers', ap_id, 1, true),
      ('AP-STOVE', 'Stoves & Ovens', 'Electric stoves and ovens', ap_id, 2, true),
      ('AP-HVAC', 'HVAC Units', 'Air conditioning and HVAC units', ap_id, 3, true),
      ('AP-PUMP', 'Pumps', 'Electrical pumps and motors', ap_id, 4, true)
    ON CONFLICT (category_code) DO NOTHING;
  END IF;
END $$;

-- Insert seed materials for Conductors
INSERT INTO master_materials (material_code, material_name, description, category_id, unit, standard_supply_cost, standard_install_cost, effective_from, is_active)
SELECT 
  code, name, description, 
  (SELECT id FROM material_categories WHERE category_code = cat_code),
  'm', supply, install, CURRENT_DATE, true
FROM (VALUES
  ('COND-1.5-R', 'Red', 'PVC insulated 1.5mm² copper conductor - Red (Live)', 'COND-1.5', 4.50, 3.00),
  ('COND-1.5-B', 'Blue', 'PVC insulated 1.5mm² copper conductor - Blue (Neutral)', 'COND-1.5', 4.50, 3.00),
  ('COND-1.5-G', 'Green/Yellow', 'PVC insulated 1.5mm² copper conductor - Green/Yellow (Earth)', 'COND-1.5', 4.50, 3.00),
  ('COND-2.5-R', 'Red', 'PVC insulated 2.5mm² copper conductor - Red (Live)', 'COND-2.5', 7.50, 3.50),
  ('COND-2.5-B', 'Blue', 'PVC insulated 2.5mm² copper conductor - Blue (Neutral)', 'COND-2.5', 7.50, 3.50),
  ('COND-2.5-G', 'Green/Yellow', 'PVC insulated 2.5mm² copper conductor - Green/Yellow (Earth)', 'COND-2.5', 7.50, 3.50),
  ('COND-4-R', 'Red', 'PVC insulated 4mm² copper conductor - Red (Live)', 'COND-4', 12.00, 4.00),
  ('COND-4-B', 'Blue', 'PVC insulated 4mm² copper conductor - Blue (Neutral)', 'COND-4', 12.00, 4.00),
  ('COND-4-G', 'Green/Yellow', 'PVC insulated 4mm² copper conductor - Green/Yellow (Earth)', 'COND-4', 12.00, 4.00),
  ('COND-6-R', 'Red', 'PVC insulated 6mm² copper conductor - Red', 'COND-6', 18.00, 5.00),
  ('COND-6-B', 'Blue', 'PVC insulated 6mm² copper conductor - Blue', 'COND-6', 18.00, 5.00),
  ('COND-6-G', 'Green/Yellow', 'PVC insulated 6mm² copper conductor - Green/Yellow', 'COND-6', 18.00, 5.00),
  ('COND-10-R', 'Red', 'PVC insulated 10mm² copper conductor - Red', 'COND-10', 30.00, 6.00),
  ('COND-10-B', 'Blue', 'PVC insulated 10mm² copper conductor - Blue', 'COND-10', 30.00, 6.00),
  ('COND-10-G', 'Green/Yellow', 'PVC insulated 10mm² copper conductor - Green/Yellow', 'COND-10', 30.00, 6.00),
  ('COND-16-R', 'Red', 'PVC insulated 16mm² copper conductor - Red', 'COND-16', 48.00, 8.00),
  ('COND-16-B', 'Blue', 'PVC insulated 16mm² copper conductor - Blue', 'COND-16', 48.00, 8.00),
  ('COND-16-G', 'Green/Yellow', 'PVC insulated 16mm² copper conductor - Green/Yellow', 'COND-16', 48.00, 8.00)
) AS t(code, name, description, cat_code, supply, install)
WHERE (SELECT id FROM material_categories WHERE category_code = cat_code) IS NOT NULL
ON CONFLICT (material_code) DO NOTHING;

-- Insert seed materials for Isolators
INSERT INTO master_materials (material_code, material_name, description, category_id, unit, standard_supply_cost, standard_install_cost, effective_from, is_active)
SELECT 
  code, name, description, 
  (SELECT id FROM material_categories WHERE category_code = cat_code),
  'each', supply, install, CURRENT_DATE, true
FROM (VALUES
  ('ISO-1P-20A', '20A Single Phase', '20A single phase isolator', 'ISO-1P', 85.00, 45.00),
  ('ISO-1P-32A', '32A Single Phase', '32A single phase isolator', 'ISO-1P', 110.00, 45.00),
  ('ISO-1P-40A', '40A Single Phase', '40A single phase isolator', 'ISO-1P', 135.00, 50.00),
  ('ISO-1P-63A', '63A Single Phase', '63A single phase isolator', 'ISO-1P', 185.00, 55.00),
  ('ISO-3P-32A', '32A Three Phase', '32A three phase isolator', 'ISO-3P', 220.00, 65.00),
  ('ISO-3P-63A', '63A Three Phase', '63A three phase isolator', 'ISO-3P', 380.00, 75.00),
  ('ISO-3P-100A', '100A Three Phase', '100A three phase isolator', 'ISO-3P', 650.00, 95.00),
  ('ISO-3P-160A', '160A Three Phase', '160A three phase isolator', 'ISO-3P', 1200.00, 150.00),
  ('ISO-ROT-20A', '20A Rotary', '20A rotary isolator for motors', 'ISO-ROT', 145.00, 55.00),
  ('ISO-ROT-32A', '32A Rotary', '32A rotary isolator for motors', 'ISO-ROT', 185.00, 60.00),
  ('ISO-ROT-63A', '63A Rotary', '63A rotary isolator for motors', 'ISO-ROT', 320.00, 75.00)
) AS t(code, name, description, cat_code, supply, install)
WHERE (SELECT id FROM material_categories WHERE category_code = cat_code) IS NOT NULL
ON CONFLICT (material_code) DO NOTHING;

-- Insert seed materials for Socket Outlets
INSERT INTO master_materials (material_code, material_name, description, category_id, unit, standard_supply_cost, standard_install_cost, effective_from, is_active)
SELECT 
  code, name, description, 
  (SELECT id FROM material_categories WHERE category_code = cat_code),
  'each', supply, install, CURRENT_DATE, true
FROM (VALUES
  ('SOCK-13A-1G', 'Single 13A', 'Single 13A socket outlet complete with flush box', 'SOCK-13A', 65.00, 35.00),
  ('SOCK-13A-2G', 'Double 13A', 'Double 13A socket outlet complete with flush box', 'SOCK-13A', 95.00, 40.00),
  ('SOCK-13A-1G-SW', 'Single 13A Switched', 'Single 13A switched socket outlet complete', 'SOCK-13A', 75.00, 35.00),
  ('SOCK-13A-2G-SW', 'Double 13A Switched', 'Double 13A switched socket outlet complete', 'SOCK-13A', 115.00, 40.00),
  ('SOCK-16A-1G', '16A Industrial', '16A industrial socket outlet - surface mounted', 'SOCK-16A', 185.00, 55.00),
  ('SOCK-16A-COM', '16A Commando', '16A commando socket outlet with enclosure', 'SOCK-16A', 245.00, 65.00),
  ('SOCK-32A-1G', '32A Industrial', '32A industrial socket outlet - surface mounted', 'SOCK-32A', 320.00, 75.00),
  ('SOCK-32A-COM', '32A Commando', '32A commando socket outlet with enclosure', 'SOCK-32A', 420.00, 85.00),
  ('SOCK-USB-2G', 'Double with USB', 'Double socket outlet with 2x USB-A charging ports', 'SOCK-USB', 185.00, 45.00),
  ('SOCK-USB-2G-C', 'Double with USB-C', 'Double socket outlet with USB-A and USB-C ports', 'SOCK-USB', 220.00, 45.00)
) AS t(code, name, description, cat_code, supply, install)
WHERE (SELECT id FROM material_categories WHERE category_code = cat_code) IS NOT NULL
ON CONFLICT (material_code) DO NOTHING;

-- Insert seed materials for Power Skirting
INSERT INTO master_materials (material_code, material_name, description, category_id, unit, standard_supply_cost, standard_install_cost, effective_from, is_active)
SELECT 
  code, name, description, 
  (SELECT id FROM material_categories WHERE category_code = cat_code),
  unit, supply, install, CURRENT_DATE, true
FROM (VALUES
  ('PWR-SK-3C-STD', '3 Comp Standard', 'Standard 3 compartment power skirting - 3m length', 'PWR-SK-3C', 'm', 125.00, 45.00),
  ('PWR-SK-3C-HD', '3 Comp Heavy Duty', 'Heavy duty 3 compartment power skirting - 3m length', 'PWR-SK-3C', 'm', 165.00, 50.00),
  ('PWR-SK-INT', 'Internal Corner', 'Internal corner for power skirting', 'PWR-SK-ACC', 'each', 85.00, 25.00),
  ('PWR-SK-EXT', 'External Corner', 'External corner for power skirting', 'PWR-SK-ACC', 'each', 85.00, 25.00),
  ('PWR-SK-JNT', 'Straight Joint', 'Straight joint coupler for power skirting', 'PWR-SK-ACC', 'each', 35.00, 15.00),
  ('PWR-SK-END', 'End Cap', 'End cap for power skirting', 'PWR-SK-ACC', 'each', 25.00, 10.00)
) AS t(code, name, description, cat_code, unit, supply, install)
WHERE (SELECT id FROM material_categories WHERE category_code = cat_code) IS NOT NULL
ON CONFLICT (material_code) DO NOTHING;

-- Insert seed materials for Power Poles
INSERT INTO master_materials (material_code, material_name, description, category_id, unit, standard_supply_cost, standard_install_cost, effective_from, is_active)
SELECT 
  code, name, description, 
  (SELECT id FROM material_categories WHERE category_code = cat_code),
  'each', supply, install, CURRENT_DATE, true
FROM (VALUES
  ('PWR-PL-2W', '2-Way Power Pole', 'Standard power pole with 2x 13A sockets', 'PWR-PL-STD', 850.00, 185.00),
  ('PWR-PL-4W', '4-Way Power Pole', 'Standard power pole with 4x 13A sockets', 'PWR-PL-STD', 1150.00, 225.00),
  ('PWR-PL-4W-D', '4-Way with Data', 'Power pole with 4x 13A sockets and 2x data outlets', 'PWR-PL-STD', 1450.00, 275.00),
  ('PWR-PL-6W', '6-Way Power Pole', 'Standard power pole with 6x 13A sockets', 'PWR-PL-STD', 1550.00, 285.00),
  ('PWR-PL-ADJ-2W', '2-Way Adjustable', 'Height adjustable power pole with 2x 13A sockets', 'PWR-PL-ADJ', 1250.00, 225.00),
  ('PWR-PL-ADJ-4W', '4-Way Adjustable', 'Height adjustable power pole with 4x 13A sockets', 'PWR-PL-ADJ', 1650.00, 285.00)
) AS t(code, name, description, cat_code, supply, install)
WHERE (SELECT id FROM material_categories WHERE category_code = cat_code) IS NOT NULL
ON CONFLICT (material_code) DO NOTHING;

-- Insert seed materials for Appliances
INSERT INTO master_materials (material_code, material_name, description, category_id, unit, standard_supply_cost, standard_install_cost, effective_from, is_active)
SELECT 
  code, name, description, 
  (SELECT id FROM material_categories WHERE category_code = cat_code),
  'each', supply, install, CURRENT_DATE, true
FROM (VALUES
  ('AP-GEY-100', '100L Geyser', 'Electric geyser 100 litre - supply and install', 'AP-GEYSER', 3500.00, 1850.00),
  ('AP-GEY-150', '150L Geyser', 'Electric geyser 150 litre - supply and install', 'AP-GEYSER', 4500.00, 1950.00),
  ('AP-GEY-200', '200L Geyser', 'Electric geyser 200 litre - supply and install', 'AP-GEYSER', 5800.00, 2150.00),
  ('AP-STOVE-4P', '4 Plate Stove', 'Electric 4 plate stove hob - connection only', 'AP-STOVE', 0.00, 650.00),
  ('AP-STOVE-OVEN', 'Built-in Oven', 'Built-in electric oven - connection only', 'AP-STOVE', 0.00, 450.00),
  ('AP-AC-9K', '9000 BTU AC', 'Split air conditioner 9000 BTU - electrical connection', 'AP-HVAC', 0.00, 850.00),
  ('AP-AC-12K', '12000 BTU AC', 'Split air conditioner 12000 BTU - electrical connection', 'AP-HVAC', 0.00, 950.00),
  ('AP-AC-18K', '18000 BTU AC', 'Split air conditioner 18000 BTU - electrical connection', 'AP-HVAC', 0.00, 1150.00),
  ('AP-AC-24K', '24000 BTU AC', 'Split air conditioner 24000 BTU - electrical connection', 'AP-HVAC', 0.00, 1350.00),
  ('AP-PUMP-0.5', '0.5kW Pump', 'Electrical connection for 0.5kW pump/motor', 'AP-PUMP', 0.00, 450.00),
  ('AP-PUMP-1.0', '1.0kW Pump', 'Electrical connection for 1.0kW pump/motor', 'AP-PUMP', 0.00, 550.00),
  ('AP-PUMP-2.2', '2.2kW Pump', 'Electrical connection for 2.2kW pump/motor', 'AP-PUMP', 0.00, 750.00)
) AS t(code, name, description, cat_code, supply, install)
WHERE (SELECT id FROM material_categories WHERE category_code = cat_code) IS NOT NULL
ON CONFLICT (material_code) DO NOTHING;