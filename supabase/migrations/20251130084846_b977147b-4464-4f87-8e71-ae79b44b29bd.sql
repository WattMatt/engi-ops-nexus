-- Add comprehensive electrical material sub-categories for better organization
INSERT INTO public.material_categories (category_code, category_name, parent_category_id, sort_order, description) 
SELECT 
  sub.code,
  sub.name,
  parent.id,
  sub.sort_order,
  sub.description
FROM (
  VALUES 
    -- Under Cables (CB)
    ('CB-LV', 'LV Power Cables', 'CB', 10, 'Low voltage power cables - XLPE, PVC'),
    ('CB-MV', 'MV Cables', 'CB', 20, 'Medium voltage cables 11kV, 22kV'),
    ('CB-FL', 'Flexible Cables', 'CB', 30, 'Cabtyre, trailing cables'),
    ('CB-CT', 'Control Cables', 'CB', 40, 'Multi-core control and instrumentation'),
    ('CB-FR', 'Fire Rated Cables', 'CB', 50, 'Fire resistant and low smoke cables'),
    
    -- Under Containment (CT)
    ('CT-LD', 'Ladder Rack', 'CT', 10, 'Heavy duty cable ladder systems'),
    ('CT-PF', 'Perforated Tray', 'CT', 20, 'Perforated cable tray'),
    ('CT-ST', 'Solid Tray', 'CT', 30, 'Solid bottom cable tray'),
    ('CT-WM', 'Wire Mesh Tray', 'CT', 40, 'Wire basket cable management'),
    ('CT-MT', 'Mini Trunking', 'CT', 50, 'Surface mount mini trunking'),
    ('CT-SK', 'Skirting Trunking', 'CT', 60, 'Skirting duct systems'),
    ('CT-FL', 'Floor Trunking', 'CT', 70, 'Under floor and raised floor systems'),
    ('CT-RG', 'Rigid Conduit', 'CT', 80, 'Steel and PVC rigid conduit'),
    ('CT-FX', 'Flexible Conduit', 'CT', 90, 'Corrugated and metallic flex'),
    
    -- Under Distribution (DB)
    ('DB-MS', 'Main Switchboards', 'DB', 10, 'MSB, main distribution boards'),
    ('DB-SS', 'Sub-Distribution', 'DB', 20, 'Sub-DBs, floor DBs'),
    ('DB-FN', 'Final Distribution', 'DB', 30, 'Final circuit DBs'),
    ('DB-MC', 'MCCBs', 'DB', 40, 'Moulded case circuit breakers'),
    ('DB-MB', 'MCBs & RCDs', 'DB', 50, 'Miniature CBs and residual devices'),
    ('DB-IS', 'Isolators', 'DB', 60, 'Switch disconnectors, isolators'),
    ('DB-MT', 'CTs & Metering', 'DB', 70, 'Current transformers, meters'),
    
    -- New parent: Accessories (AC)
    ('AC', 'Accessories', NULL, 600, 'Electrical accessories and fittings'),
    
    -- New parent: Earthing (ER)  
    ('ER', 'Earthing & Lightning', NULL, 700, 'Earthing systems and lightning protection')
) AS sub(code, name, parent_code, sort_order, description)
LEFT JOIN public.material_categories parent ON parent.category_code = sub.parent_code
WHERE NOT EXISTS (
  SELECT 1 FROM public.material_categories WHERE category_code = sub.code
);

-- Add sub-categories for new parents
INSERT INTO public.material_categories (category_code, category_name, parent_category_id, sort_order, description)
SELECT 
  sub.code,
  sub.name,
  parent.id,
  sub.sort_order,
  sub.description
FROM (
  VALUES
    ('AC-SW', 'Switches', 'AC', 10, 'Light switches, dimmers'),
    ('AC-SK', 'Socket Outlets', 'AC', 20, 'Power points, dedicated sockets'),
    ('AC-JB', 'Junction Boxes', 'AC', 30, 'Junction and pull boxes'),
    ('AC-GL', 'Glands & Lugs', 'AC', 40, 'Cable glands and terminations'),
    ('AC-FX', 'Fixings', 'AC', 50, 'Brackets, clips, supports'),
    
    ('ER-EC', 'Earth Conductors', 'ER', 10, 'Bare copper, earth cables'),
    ('ER-ER', 'Earth Rods', 'ER', 20, 'Copper bonded earth rods'),
    ('ER-EB', 'Earth Bars', 'ER', 30, 'Main and supplementary earth bars'),
    ('ER-LP', 'Lightning Protection', 'ER', 40, 'Air terminals, down conductors'),
    ('ER-EX', 'Exothermic Welds', 'ER', 50, 'Cadweld, thermoweld connections')
) AS sub(code, name, parent_code, sort_order, description)
INNER JOIN public.material_categories parent ON parent.category_code = sub.parent_code
WHERE NOT EXISTS (
  SELECT 1 FROM public.material_categories WHERE category_code = sub.code
);