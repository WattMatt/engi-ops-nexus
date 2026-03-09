
-- Clear dependent data first
DELETE FROM public.takeoff_measurements WHERE catalog_id IS NOT NULL;
DELETE FROM public.takeoff_assembly_items;

-- Add new columns
ALTER TABLE public.takeoff_catalog ADD COLUMN IF NOT EXISTS item_code text;
ALTER TABLE public.takeoff_catalog ADD COLUMN IF NOT EXISTS sub_category text;
ALTER TABLE public.takeoff_catalog ADD COLUMN IF NOT EXISTS description text;

-- Now safe to delete catalog
DELETE FROM public.takeoff_catalog;

-- ============================================================
-- FULL EQUIPMENT CATALOG INSERT
-- ============================================================

-- LIGHTNING PROTECTION
INSERT INTO public.takeoff_catalog (item_code, category, sub_category, name, description, unit, conduit_size, conduit_type, default_vertical_drop, waste_percentage) VALUES
('2-010100-0101', 'Lightning Protection', 'General', 'Lightning protection system', 'Supply and installation of lightning protection system', 'Sum', NULL, NULL, 0, 0);

-- INTERNAL MV WORKS
INSERT INTO public.takeoff_catalog (item_code, category, sub_category, name, description, unit, conduit_size, conduit_type, default_vertical_drop, waste_percentage) VALUES
('2-020100-0101', 'Internal MV Works', 'Ring Main Units', '3-way ring main unit', 'Supply and installation of bulk metered type 3-way ring main unit', 'No', NULL, NULL, 0, 0),
('2-020200-0101', 'Internal MV Works', 'Miniature Substations', 'Miniature substation PC', 'Prime Cost amount for supply and delivery of miniature substations', 'Sum', NULL, NULL, 0, 0),
('2-020200-0201', 'Internal MV Works', 'Miniature Substations', 'Install miniature substation 1000kVA', 'Allow for installation of miniature substations', 'No', '1000kVA', NULL, 0, 0),
('2-020200-0301', 'Internal MV Works', 'Miniature Substations', 'Plinth for substation 1000kVA', 'Allow for pre-cast concrete plinth for miniature substations', 'No', '1000kVA', NULL, 0, 0),
('2-020200-0401', 'Internal MV Works', 'Miniature Substations', 'Earthing of substation', 'Prime Cost amount for earthing of miniature substations', 'Sum', NULL, NULL, 0, 0),
('2-020300-0101', 'Internal MV Works', 'Earth Terminations', 'Earth termination 70mm²', 'Bare copper earth conductor terminations, supply and terminate', 'No', '70mm²', NULL, 0, 0),
('2-020400-0101', 'Internal MV Works', 'Earthing', 'Earthing per Code of Practice', 'Earthing of all equipment as per Code of Practice', 'Sum', NULL, NULL, 0, 0),
('2-020400-0201', 'Internal MV Works', 'Earthing', 'Earth conductor with MV cable 70mm²', 'Bare copper earth conductor installed with medium voltage cable', 'm', '70mm²', NULL, 0, 0.05),
('2-020500-0101', 'Internal MV Works', 'Medium Voltage Cable', 'MV cable 50mm² XLPE', 'Supply and installation of three core, 11kV XLPE copper cable in trench', 'm', '50mm²', 'XLPE', 0, 0.05),
('2-020500-0102', 'Internal MV Works', 'Medium Voltage Cable', 'MV cable end 50mm²', '50mm² cable end', 'No', '50mm²', 'XLPE', 0, 0),
('2-020500-0103', 'Internal MV Works', 'Medium Voltage Cable', 'MV cable joint 50mm²', '50mm² cable joint', 'No', '50mm²', 'XLPE', 0, 0),
('2-020500-0104', 'Internal MV Works', 'Medium Voltage Cable', 'MV cable 95mm² XLPE', '95mm² cable', 'm', '95mm²', 'XLPE', 0, 0.05),
('2-020500-0105', 'Internal MV Works', 'Medium Voltage Cable', 'MV cable end 95mm²', '95mm² cable end', 'No', '95mm²', 'XLPE', 0, 0),
('2-020500-0106', 'Internal MV Works', 'Medium Voltage Cable', 'MV cable joint 95mm²', '95mm² cable joint', 'No', '95mm²', 'XLPE', 0, 0);

-- EXTERNAL MV WORKS
INSERT INTO public.takeoff_catalog (item_code, category, sub_category, name, description, unit, conduit_size, conduit_type, default_vertical_drop, waste_percentage) VALUES
('2-030100-0101', 'External MV Works', 'Ring Main Units', '3-way ring main unit (ext)', 'Supply and installation of bulk metered type 3-way ring main unit', 'No', NULL, NULL, 0, 0),
('2-030500-0101', 'External MV Works', 'Medium Voltage Cable', 'Ext MV cable 95mm² XLPE', 'Supply and installation of three core, 11kV XLPE copper cable in trench', 'm', '95mm²', 'XLPE', 0, 0.05),
('2-030500-0102', 'External MV Works', 'Medium Voltage Cable', 'Ext MV cable end 95mm²', '95mm² cable end', 'No', '95mm²', 'XLPE', 0, 0),
('2-030500-0103', 'External MV Works', 'Medium Voltage Cable', 'Ext MV cable joint 95mm²', '95mm² cable joint', 'No', '95mm²', 'XLPE', 0, 0);

-- APPLIANCES
INSERT INTO public.takeoff_catalog (item_code, category, sub_category, name, description, unit, conduit_size, conduit_type, default_vertical_drop, waste_percentage) VALUES
('2-040100-0101', 'Appliances', 'Socket Outlets', '5A unswitched socket outlet', '5A un-switched socket outlet in 100x50 box', 'No', NULL, NULL, 0, 0),
('2-040100-0102', 'Appliances', 'Socket Outlets', '5A 3-pin unswitched socket outlet', '5A 3-pin unswitched socket outlet in 100x50 box', 'No', NULL, NULL, 0, 0),
('2-040100-0103', 'Appliances', 'Light Switches', '16A light switch', '16A light switch c/w cradle fixing screws and cover plate', 'No', NULL, NULL, 0, 0),
('2-040100-0104', 'Appliances', 'Socket Outlets', '16A 3-pin switched socket (new RSA)', '16A 3-pin switched socket outlet with new RSA in 100x100 box', 'No', NULL, NULL, 0, 0),
('2-040100-0105', 'Appliances', 'Socket Outlets', '16A single switched socket', '16A 3-pin single switched socket outlet in 100x100 box', 'No', NULL, NULL, 0, 0),
('2-040100-0106', 'Appliances', 'Socket Outlets', '16A double switched socket', '16A 3-pin double switched socket outlet in 100x100 box', 'No', NULL, NULL, 0, 0),
('2-040100-0107', 'Appliances', 'Socket Outlets', '16A dedicated switched socket', '16A 3-pin dedicated switched socket outlet in 100x100 box', 'No', NULL, NULL, 0, 0),
('2-040100-0108', 'Appliances', 'Socket Outlets', '16A dedicated single socket', '16A 3-pin dedicated single-switched socket outlet in 100x100 box', 'No', NULL, NULL, 0, 0),
('2-040100-0109', 'Appliances', 'Socket Outlets', '16A dedicated double socket', '16A 3-pin dedicated double-switched socket outlet in 100x100 box', 'No', NULL, NULL, 0, 0),
('2-040100-0110', 'Appliances', 'Socket Outlets', '16A 5-pin 3-phase socket', '16A 5-pin three phase socket outlet c/w socket', 'No', NULL, NULL, 0, 0),
('2-040100-0111', 'Appliances', 'Socket Outlets', '32A 5-pin 3-phase socket', '32A 5-pin three phase socket outlet c/w socket', 'No', NULL, NULL, 0, 0),
('2-040100-0201', 'Appliances', 'Light Switches', 'Flush 1-way 1-lever switch', 'Flush 1-way, 1-lever light switch', 'No', NULL, NULL, 0, 0),
('2-040100-0202', 'Appliances', 'Light Switches', 'Flush 1-way 2-lever switch', 'Flush 1-way, 2-lever light switch', 'No', NULL, NULL, 0, 0),
('2-040100-0301', 'Appliances', 'Key Switches', '2-position key switch', 'Supply and install a standard 2-position key switch', 'No', NULL, NULL, 0, 0),
('2-040100-0401', 'Appliances', 'Isolators', '20A DP isolator (flush)', 'Isolator mounted flush or in surface box', 'No', '20A DP', NULL, 0, 0),
('2-040100-0402', 'Appliances', 'Isolators', '20A TP isolator (flush)', 'Isolator mounted flush or in surface box', 'No', '20A TP', NULL, 0, 0),
('2-040100-0403', 'Appliances', 'Isolators', '20A DP industrial isolator', 'Industrial isolator', 'No', '20A DP', NULL, 0, 0),
('2-040100-0404', 'Appliances', 'Isolators', '30A TP isolator (flush)', 'Isolator mounted flush or in surface box', 'No', '30A TP', NULL, 0, 0),
('2-040100-0501', 'Appliances', 'Isolators', '30A TP WP isolator', 'IP54 rated fibre-reinforced weatherproof box', 'No', '30A TP', NULL, 0, 0),
('2-040100-0601', 'Appliances', 'Socket Outlets', '16A SSO in power skirting', '16A 3-pin single switched socket outlet in power skirting', 'No', NULL, NULL, 0, 0),
('2-040100-0602', 'Appliances', 'Socket Outlets', '16A dedicated SSO in skirting', '16A 3-pin dedicated switched socket outlet in power skirting', 'No', NULL, NULL, 0, 0);

-- DISTRIBUTION BOARDS
INSERT INTO public.takeoff_catalog (item_code, category, sub_category, name, description, unit, conduit_size, conduit_type, default_vertical_drop, waste_percentage) VALUES
('2-040200-0101', 'Distribution Boards', 'LV Distribution Boards', 'LV DB PC amount', 'Prime cost amount for manufacture and delivery of LV distribution boards', 'Sum', NULL, NULL, 0, 0),
('2-040200-0201', 'Distribution Boards', 'LV Distribution Boards', 'Install DB 84-way 200A TP', 'Placing in position main boards and sub-distribution boards', 'Lot', '84-way', '200A TP', 0, 0),
('2-040200-0202', 'Distribution Boards', 'LV Distribution Boards', 'Install DB 72-way 150A TP', 'Placing in position', 'Lot', '72-way', '150A TP', 0, 0),
('2-040200-0203', 'Distribution Boards', 'LV Distribution Boards', 'Install DB 60-way 120A TP', 'Placing in position', 'Lot', '60-way', '120A TP', 0, 0),
('2-040200-0204', 'Distribution Boards', 'LV Distribution Boards', 'Install DB 60-way 100A TP', 'Placing in position', 'Lot', '60-way', '100A TP', 0, 0),
('2-040200-0205', 'Distribution Boards', 'LV Distribution Boards', 'Install DB 48-way 80A TP', 'Placing in position', 'Lot', '48-way', '80A TP', 0, 0),
('2-040200-0206', 'Distribution Boards', 'LV Distribution Boards', 'Install DB 36-way 60A TP', 'Placing in position', 'Lot', '36-way', '60A TP', 0, 0);

-- LIGHTING
INSERT INTO public.takeoff_catalog (item_code, category, sub_category, name, description, unit, conduit_size, conduit_type, default_vertical_drop, waste_percentage) VALUES
('2-040300-0101', 'Lighting', 'General Light Fittings', 'Type A - Revoc 4000 TL Sur', 'Take delivery, unpack, store, install and connect', 'No', NULL, NULL, 0, 0),
('2-040300-0102', 'Lighting', 'General Light Fittings', 'Type B - Pendant Cupcake', 'Take delivery, unpack, store, install and connect', 'No', NULL, NULL, 0, 0),
('2-040300-0103', 'Lighting', 'General Light Fittings', 'Type C - Nano 800/935BBL', 'Take delivery, unpack, store, install and connect', 'No', NULL, NULL, 0, 0),
('2-040300-0104', 'Lighting', 'General Light Fittings', 'Type D - Track Lighting', 'Take delivery, unpack, store, install and connect', 'm', NULL, NULL, 0, 0.05),
('2-040301-0101', 'Lighting', 'Installation of Light Fittings', 'Type A - 1200x600 recessed 3-lamp', 'Recessed light fitting with low brightness diffuser', 'No', NULL, NULL, 0, 0),
('2-040301-0102', 'Lighting', 'Installation of Light Fittings', 'Type A1 - Recessed downlighter 2x18W PL', 'Recessed downlighter', 'No', NULL, NULL, 0, 0),
('2-040301-0103', 'Lighting', 'Installation of Light Fittings', 'Type A4 - Recessed 23W LED', 'Recessed downlighter 23W LED', 'No', NULL, NULL, 0, 0),
('2-040301-0104', 'Lighting', 'Installation of Light Fittings', 'Type A5 - Surface open channel 2x28W T5', 'Surface-mounted with wire guard', 'No', NULL, NULL, 0, 0),
('2-040301-0105', 'Lighting', 'Installation of Light Fittings', 'Type A6 - Wall-mounted 2x PL 26W', 'Wall-mounted flat back type', 'No', NULL, NULL, 0, 0),
('2-040301-0106', 'Lighting', 'Installation of Light Fittings', 'Type B - Recessed 23W LED', 'Recessed downlighter 23W LED', 'No', NULL, NULL, 0, 0),
('2-040301-0107', 'Lighting', 'Installation of Light Fittings', 'Type B1 - Open Channel 2x54W T5', 'Wall mounted open channel', 'No', NULL, NULL, 0, 0),
('2-040301-0108', 'Lighting', 'Installation of Light Fittings', 'Type B1 - Recessed LED strip', 'Recessed LED light strip', 'm', NULL, NULL, 0, 0.05),
('2-040301-0201', 'Lighting', 'Installation of Light Fittings', 'Pendant fitting', 'Pendant fitting', 'No', NULL, NULL, 0, 0),
('2-040301-0202', 'Lighting', 'Installation of Light Fittings', 'Downlighter 150W MH', 'Downlighter with 150W metal halide', 'No', NULL, NULL, 0, 0),
('2-040301-0203', 'Lighting', 'Installation of Light Fittings', 'Downlighter 12V LV', 'Downlighter with 12V LV lamp', 'No', NULL, NULL, 0, 0),
('2-040301-0204', 'Lighting', 'Installation of Light Fittings', '1200mm surface fluorescent', '1200mm single lamp surface fluorescent', 'No', NULL, NULL, 0, 0),
('2-040301-0209', 'Lighting', 'Installation of Light Fittings', 'Spotlight', 'Spotlight', 'No', NULL, NULL, 0, 0),
('2-040301-0210', 'Lighting', 'Installation of Light Fittings', 'Emergency light', 'Emergency light', 'No', NULL, NULL, 0, 0),
('2-040301-0211', 'Lighting', 'Installation of Light Fittings', 'Recessed LED Panel 1200x600', 'Recessed LED Panel (1200x600)', 'No', NULL, NULL, 0, 0),
('2-040301-0212', 'Lighting', 'Installation of Light Fittings', 'Recessed downlighter', 'Recessed downlighter', 'No', NULL, NULL, 0, 0),
('2-040301-0213', 'Lighting', 'Installation of Light Fittings', 'Bulkhead LED', 'Bulkhead (LED)', 'No', NULL, NULL, 0, 0),
('2-040302-0101', 'Lighting', 'Light Fittings', 'Recessed fluorescent 600x600', 'Recessed fluorescent (600x600)', 'No', NULL, NULL, 0, 0),
('2-040302-0106', 'Lighting', 'Light Fittings', 'Recessed downlighter 2x26W', '2 x 26W lamps', 'No', NULL, NULL, 0, 0),
('2-040302-0201', 'Lighting', 'Light Fittings', 'TYPE A - Recessed 600x600 Panel', 'Recessed 600x600 Panels', 'No', NULL, NULL, 0, 0),
('2-040302-0202', 'Lighting', 'Light Fittings', 'TYPE B - 1x35W surface open', '1x35W surface mounted open channel', 'No', NULL, NULL, 0, 0),
('2-040302-0203', 'Lighting', 'Light Fittings', 'TYPE C - 36W downlight', '36W downlight', 'No', NULL, NULL, 0, 0),
('2-040302-0204', 'Lighting', 'Light Fittings', 'TYPE D - 13W downlight', '13W downlight', 'No', NULL, NULL, 0, 0);

-- LIGHT SWITCHES
INSERT INTO public.takeoff_catalog (item_code, category, sub_category, name, description, unit, conduit_size, conduit_type, default_vertical_drop, waste_percentage) VALUES
('2-040303-0101', 'Lighting', 'Light Switches', 'Flush 1-way 1-lever', '16A light switch', 'No', NULL, NULL, 0, 0),
('2-040303-0102', 'Lighting', 'Light Switches', 'Flush 1-way 2-lever', '16A light switch', 'No', NULL, NULL, 0, 0),
('2-040303-0103', 'Lighting', 'Light Switches', 'Flush 1-way 4-lever', '16A light switch', 'No', NULL, NULL, 0, 0),
('2-040303-0104', 'Lighting', 'Light Switches', 'Flush 2-way 1-lever', '16A light switch', 'No', NULL, NULL, 0, 0),
('2-040303-0105', 'Lighting', 'Light Switches', 'Flush 2-way 2-lever', '16A light switch', 'No', NULL, NULL, 0, 0),
('2-040303-0106', 'Lighting', 'Light Switches', '10A 3-position key switch', '10A, 240V 3-position key switch', 'No', NULL, NULL, 0, 0),
('2-040303-0107', 'Lighting', 'Light Switches', 'Motion sensor', 'Motion sensor', 'No', NULL, NULL, 0, 0),
('2-040303-0108', 'Lighting', 'Light Switches', 'Doorbell', 'Doorbell', 'No', NULL, NULL, 0, 0);

-- PHOTOCELLS
INSERT INTO public.takeoff_catalog (item_code, category, sub_category, name, description, unit, conduit_size, conduit_type, default_vertical_drop, waste_percentage) VALUES
('2-040305-0101', 'Lighting', 'Photocells', 'Photocell in bulkhead', 'Photocell switch in empty square bulkhead', 'No', NULL, NULL, 0, 0),
('2-040305-0102', 'Lighting', 'Photocells', 'Photocell switch', 'Photocell switch', 'No', NULL, NULL, 0, 0);

-- CONDUIT
INSERT INTO public.takeoff_catalog (item_code, category, sub_category, name, description, unit, conduit_size, conduit_type, default_vertical_drop, waste_percentage) VALUES
('2-040500-0101', 'Conduit', 'PVC in Concrete/Brick', '20mm PVC in concrete/brick', 'PVC conduits in concrete or brick or partition', 'm', '20mm', 'PVC', 0, 0.05),
('2-040500-0102', 'Conduit', 'PVC in Concrete/Brick', '25mm PVC in concrete/brick', 'PVC conduits in concrete or brick or partition', 'm', '25mm', 'PVC', 0, 0.05),
('2-040500-0103', 'Conduit', 'PVC in Concrete/Brick', '32mm PVC in concrete/brick', 'PVC conduits in concrete or brick or partition', 'm', '32mm', 'PVC', 0, 0.05),
('2-040500-0104', 'Conduit', 'PVC in Concrete/Brick', '25mm galv in concrete/brick', 'Galvanised conduit in concrete or brick', 'm', '25mm', 'Galvanised', 0, 0.05),
('2-040500-0201', 'Conduit', 'PVC Surface Mounted', '20mm PVC surface', 'PVC Conduit fixed to surface', 'm', '20mm', 'PVC', 0, 0.05),
('2-040500-0202', 'Conduit', 'PVC Surface Mounted', '25mm PVC surface', 'PVC Conduit fixed to surface', 'm', '25mm', 'PVC', 0, 0.05),
('2-040500-0203', 'Conduit', 'PVC Surface Mounted', '32mm PVC surface', 'PVC Conduit fixed to surface', 'm', '32mm', 'PVC', 0, 0.05),
('2-040500-0204', 'Conduit', 'PVC Surface Mounted', '25mm galv surface', 'Galvanised conduit fixed to surface', 'm', '25mm', 'Galvanised', 0, 0.05),
('2-040500-0301', 'Conduit', 'PVC Cast in Concrete', '20mm PVC cast', 'PVC conduit cast into concrete', 'm', '20mm', 'PVC', 0, 0.05),
('2-040500-0302', 'Conduit', 'PVC Cast in Concrete', '25mm PVC cast', 'PVC conduit cast into concrete', 'm', '25mm', 'PVC', 0, 0.05),
('2-040500-0303', 'Conduit', 'PVC Cast in Concrete', '32mm PVC cast', 'PVC conduit cast into concrete', 'm', '32mm', 'PVC', 0, 0.05),
('2-040500-0401', 'Conduit', 'PVC Chased in Brick', '20mm PVC chased', 'PVC conduit chased into brickwork', 'm', '20mm', 'PVC', 0, 0.05),
('2-040500-0402', 'Conduit', 'PVC Chased in Brick', '25mm PVC chased', 'PVC conduit chased into brickwork', 'm', '25mm', 'PVC', 0, 0.05),
('2-040500-0403', 'Conduit', 'PVC Chased in Brick', '32mm PVC chased', 'PVC conduit chased into brickwork', 'm', '32mm', 'PVC', 0, 0.05),
('2-040500-0501', 'Conduit', 'Galvanised Surface', '20mm galv (saddles)', 'Galvanised conduit with hospital saddles', 'm', '20mm', 'Galvanised', 0, 0.05),
('2-040500-0502', 'Conduit', 'Galvanised Surface', '25mm galv (saddles)', 'Galvanised conduit with hospital saddles', 'm', '25mm', 'Galvanised', 0, 0.05),
('2-040500-0503', 'Conduit', 'Galvanised Surface', '32mm galv (saddles)', 'Galvanised conduit with hospital saddles', 'm', '32mm', 'Galvanised', 0, 0.05);

-- CONDUIT BOXES
INSERT INTO public.takeoff_catalog (item_code, category, sub_category, name, description, unit, conduit_size, conduit_type, default_vertical_drop, waste_percentage) VALUES
('2-040600-0101', 'Conduit Boxes', 'General', '50mm round box', '50mm Ø conduit box', 'No', '50mm', NULL, 0, 0),
('2-040600-0104', 'Conduit Boxes', 'General', '100x50x50 box', '100x50x50mm conduit box', 'No', '100x50x50', NULL, 0, 0),
('2-040600-0105', 'Conduit Boxes', 'General', '100x100x50 box', '100x100x50mm conduit box', 'No', '100x100x50', NULL, 0, 0),
('2-040600-0201', 'Conduit Boxes', 'In Brickwork', '50mm box in brick', '50mm Ø box in brickwork with cover plate', 'No', '50mm', NULL, 0, 0),
('2-040600-0202', 'Conduit Boxes', 'In Brickwork', '100x100x50 in brick', '100x100x50 in brickwork with cover plate', 'No', '100x100x50', NULL, 0, 0),
('2-040600-0203', 'Conduit Boxes', 'In Brickwork', '300x300 data draw box', '300x300 data draw box in brickwork', 'No', '300x300', NULL, 0, 0),
('2-040600-0206', 'Conduit Boxes', 'General', 'Weatherproof enclosure', 'Weatherproof enclosure', 'No', NULL, NULL, 0, 0),
('2-040600-0207', 'Conduit Boxes', 'General', 'Weatherproof York box', 'Weatherproof York box', 'No', NULL, NULL, 0, 0);

-- CABLE TERMINATIONS
INSERT INTO public.takeoff_catalog (item_code, category, sub_category, name, description, unit, conduit_size, conduit_type, default_vertical_drop, waste_percentage) VALUES
('2-040700-0101', 'Cable Terminations', 'PVC/SWA/PVC 600/1000V', 'Cable gland 3C x 4mm²', 'Cable gland make-off including earth wire', 'No', '3C x 4mm²', NULL, 0, 0),
('2-040700-0102', 'Cable Terminations', 'PVC/SWA/PVC 600/1000V', 'Cable gland 4C x 4mm²', 'Cable gland make-off', 'No', '4C x 4mm²', NULL, 0, 0),
('2-040700-0103', 'Cable Terminations', 'PVC/SWA/PVC 600/1000V', 'Cable gland 4C x 6mm²', 'Cable gland make-off', 'No', '4C x 6mm²', NULL, 0, 0),
('2-040700-0104', 'Cable Terminations', 'PVC/SWA/PVC 600/1000V', 'Cable gland 4C x 10mm²', 'Cable gland make-off', 'No', '4C x 10mm²', NULL, 0, 0),
('2-040700-0105', 'Cable Terminations', 'PVC/SWA/PVC 600/1000V', 'Cable gland 4C x 16mm²', 'Cable gland make-off', 'No', '4C x 16mm²', NULL, 0, 0),
('2-040700-0106', 'Cable Terminations', 'PVC/SWA/PVC 600/1000V', 'Cable gland 4C x 25mm²', 'Cable gland make-off', 'No', '4C x 25mm²', NULL, 0, 0),
('2-040700-0107', 'Cable Terminations', 'PVC/SWA/PVC 600/1000V', 'Cable gland 4C x 35mm²', 'Cable gland make-off', 'No', '4C x 35mm²', NULL, 0, 0),
('2-040700-0108', 'Cable Terminations', 'PVC/SWA/PVC 600/1000V', 'Cable gland 4C x 50mm²', 'Cable gland make-off', 'No', '4C x 50mm²', NULL, 0, 0),
('2-040700-0109', 'Cable Terminations', 'PVC/SWA/PVC 600/1000V', 'Cable gland 4C x 70mm²', 'Cable gland make-off', 'No', '4C x 70mm²', NULL, 0, 0),
('2-040700-0110', 'Cable Terminations', 'PVC/SWA/PVC 600/1000V', 'Cable gland 4C x 95mm²', 'Cable gland make-off', 'No', '4C x 95mm²', NULL, 0, 0),
('2-040700-0111', 'Cable Terminations', 'PVC/SWA/PVC 600/1000V', 'Cable gland 4C x 120mm²', 'Cable gland make-off', 'No', '4C x 120mm²', NULL, 0, 0),
('2-040700-0112', 'Cable Terminations', 'PVC/SWA/PVC 600/1000V', 'Cable gland 4C x 150mm²', 'Cable gland make-off', 'No', '4C x 150mm²', NULL, 0, 0),
('2-040700-0113', 'Cable Terminations', 'PVC/SWA/PVC 600/1000V', 'Cable gland 4C x 185mm²', 'Cable gland make-off', 'No', '4C x 185mm²', NULL, 0, 0),
('2-040700-0114', 'Cable Terminations', 'PVC/SWA/PVC 600/1000V', 'Cable gland 4C x 240mm²', 'Cable gland make-off', 'No', '4C x 240mm²', NULL, 0, 0);

-- CABLE TRAY
INSERT INTO public.takeoff_catalog (item_code, category, sub_category, name, description, unit, conduit_size, conduit_type, default_vertical_drop, waste_percentage) VALUES
('2-040800-0106', 'Cable Tray', 'Standard', '100mm tray straight', '100mm wide straight lengths', 'm', '100mm', NULL, 0, 0.05),
('2-040800-0103', 'Cable Tray', 'Standard', '100mm tray horiz bend', '100mm wide horizontal bends', 'No', '100mm', NULL, 0, 0),
('2-040800-0104', 'Cable Tray', 'Standard', '100mm tray T-piece', '100mm wide T-pieces', 'No', '100mm', NULL, 0, 0),
('2-040800-0105', 'Cable Tray', 'Standard', '100mm tray vert bend', '100mm wide vertical bends', 'No', '100mm', NULL, 0, 0),
('2-040800-0112', 'Cable Tray', 'Standard', '200mm tray straight', '200mm wide straight lengths', 'm', '200mm', NULL, 0, 0.05),
('2-040800-0109', 'Cable Tray', 'Standard', '200mm tray horiz bend', '200mm wide horizontal bends', 'No', '200mm', NULL, 0, 0),
('2-040800-0110', 'Cable Tray', 'Standard', '200mm tray T-piece', '200mm wide T-pieces', 'No', '200mm', NULL, 0, 0),
('2-040800-0119', 'Cable Tray', 'Standard', '300mm tray straight', '300mm wide straight lengths', 'm', '300mm', NULL, 0, 0.05),
('2-040800-0115', 'Cable Tray', 'Standard', '300mm tray horiz bend', '300mm wide horizontal bends', 'No', '300mm', NULL, 0, 0),
('2-040800-0116', 'Cable Tray', 'Standard', '300mm tray T-piece', '300mm wide T-pieces', 'No', '300mm', NULL, 0, 0),
('2-040800-0125', 'Cable Tray', 'Standard', '400mm tray straight', '400mm wide straight lengths', 'm', '400mm', NULL, 0, 0.05),
('2-040800-0131', 'Cable Tray', 'Standard', '600mm tray straight', '600mm wide straight lengths', 'm', '600mm', NULL, 0, 0.05),
('2-040800-0306', 'Cable Tray', 'Heavy Duty Ladder', '100mm ladder straight', 'Heavy duty cable ladder 100mm', 'm', '100mm', NULL, 0, 0.05),
('2-040800-0312', 'Cable Tray', 'Heavy Duty Ladder', '200mm ladder straight', 'Heavy duty cable ladder 200mm', 'm', '200mm', NULL, 0, 0.05),
('2-040800-0318', 'Cable Tray', 'Heavy Duty Ladder', '300mm ladder straight', 'Heavy duty cable ladder 300mm', 'm', '300mm', NULL, 0, 0.05),
('2-040800-0324', 'Cable Tray', 'Heavy Duty Ladder', '400mm ladder straight', 'Heavy duty cable ladder 400mm', 'm', '400mm', NULL, 0, 0.05),
('2-040800-0330', 'Cable Tray', 'Heavy Duty Ladder', '600mm ladder straight', 'Heavy duty cable ladder 600mm', 'm', '600mm', NULL, 0, 0.05),
('2-040800-0336', 'Cable Tray', 'Heavy Duty Ladder', '800mm ladder straight', 'Heavy duty cable ladder 800mm', 'm', '800mm', NULL, 0, 0.05);

-- CONDUCTOR
INSERT INTO public.takeoff_catalog (item_code, category, sub_category, name, description, unit, conduit_size, conduit_type, default_vertical_drop, waste_percentage) VALUES
('2-040900-0101', 'Conductor', 'In Conduit/Trunking', '2C x 2.5mm² in conduit', 'PVC-insulated copper conductor', 'm', '2C x 2.5mm²', NULL, 0, 0.05),
('2-040900-0102', 'Conductor', 'In Conduit/Trunking', '4mm² in conduit', 'PVC-insulated copper conductor', 'm', '4mm²', NULL, 0, 0.05),
('2-040900-0103', 'Conductor', 'In Conduit/Trunking', '6mm² in conduit', 'PVC-insulated copper conductor', 'm', '6mm²', NULL, 0, 0.05),
('2-040900-0105', 'Conductor', 'In Conduit/Trunking', '2.5mm² in conduit', 'PVC-insulated copper conductor', 'm', '2.5mm²', NULL, 0, 0.05),
('2-040900-0201', 'Conductor', 'Flat Twin Suspended', '2C x 2.5mm² suspended', 'Flat twin and earth from concrete/trusses', 'm', '2C x 2.5mm²', NULL, 0, 0.05),
('2-040900-0202', 'Conductor', 'Flat Twin Suspended', '2C x 4mm² suspended', 'Flat twin and earth from concrete/trusses', 'm', '2C x 4mm²', NULL, 0, 0.05),
('2-040900-0203', 'Conductor', 'Flat Twin Suspended', '4C x 2.5mm² Norsk', 'Norsk cable suspended', 'm', '4C x 2.5mm²', 'Norsk', 0, 0.05),
('2-040900-0204', 'Conductor', 'Flat Twin Suspended', '4C x 4mm² Norsk', 'Norsk cable suspended', 'm', '4C x 4mm²', 'Norsk', 0, 0.05),
('2-040900-0301', 'Conductor', 'Flat Twin Terminations', '2C x 2.5mm² termination', 'Flat twin termination', 'No', '2C x 2.5mm²', NULL, 0, 0),
('2-040900-0302', 'Conductor', 'Flat Twin Terminations', '2C x 4mm² termination', 'Flat twin termination', 'No', '2C x 4mm²', NULL, 0, 0);

-- DRAW WIRE
INSERT INTO public.takeoff_catalog (item_code, category, sub_category, name, description, unit, conduit_size, conduit_type, default_vertical_drop, waste_percentage) VALUES
('2-041000-0101', 'Draw Wire', 'General', '1mm galv draw wire', 'Galvanised draw wire in conduit', 'm', '1mm', 'Galvanised', 0, 0.05),
('2-041000-0102', 'Draw Wire', 'General', '1.6mm galv draw wire', 'Galvanised draw wire in conduit', 'm', '1.6mm', 'Galvanised', 0, 0.05);

-- EARTH CONDUCTOR
INSERT INTO public.takeoff_catalog (item_code, category, sub_category, name, description, unit, conduit_size, conduit_type, default_vertical_drop, waste_percentage) VALUES
('2-041100-0101', 'Earth Conductor', 'In Conduit/Trunking', '2.5mm² earth in conduit', 'Bare copper earth conductor', 'm', '2.5mm²', NULL, 0, 0.05),
('2-041100-0102', 'Earth Conductor', 'In Conduit/Trunking', '4mm² earth in conduit', 'Bare copper earth conductor', 'm', '4mm²', NULL, 0, 0.05),
('2-041100-0401', 'Earth Conductor', 'Green/Yellow', '1.5mm² green/yellow', '1.5mm² green/yellow', 'm', '1.5mm²', NULL, 0, 0.05),
('2-041100-0402', 'Earth Conductor', 'Green/Yellow', '2.5mm² green/yellow', '2.5mm² green/yellow', 'm', '2.5mm²', NULL, 0, 0.05);

-- AC REQUIREMENTS
INSERT INTO public.takeoff_catalog (item_code, category, sub_category, name, description, unit, conduit_size, conduit_type, default_vertical_drop, waste_percentage) VALUES
('2-041200-0101', 'AC Requirements', 'WP Isolators', 'WP isolator 20A DP', 'Weatherproof isolator surface mounted', 'No', '20A DP', NULL, 0, 0),
('2-041200-0102', 'AC Requirements', 'WP Isolators', 'WP isolator 25A DP', 'Weatherproof isolator surface mounted', 'No', '25A DP', NULL, 0, 0),
('2-041200-0103', 'AC Requirements', 'WP Isolators', 'WP isolator 32A DP', 'Weatherproof isolator surface mounted', 'No', '32A DP', NULL, 0, 0),
('2-041200-0104', 'AC Requirements', 'WP Isolators', 'WP isolator 20A TP', 'Weatherproof isolator surface mounted', 'No', '20A TP', NULL, 0, 0),
('2-041200-0105', 'AC Requirements', 'WP Isolators', 'WP isolator 25A TP', 'Weatherproof isolator surface mounted', 'No', '25A TP', NULL, 0, 0),
('2-041200-0106', 'AC Requirements', 'WP Isolators', 'WP isolator 32A TP', 'Weatherproof isolator surface mounted', 'No', '32A TP', NULL, 0, 0),
('2-041200-0107', 'AC Requirements', 'WP Isolators', 'WP isolator 45A TP', 'Weatherproof isolator surface mounted', 'No', '45A TP', NULL, 0, 0),
('2-041200-0108', 'AC Requirements', 'WP Isolators', 'WP isolator 63A TP', 'Weatherproof isolator surface mounted', 'No', '63A TP', NULL, 0, 0),
('2-041200-0109', 'AC Requirements', 'WP Isolators', 'WP isolator 80A TP', 'Weatherproof isolator surface mounted', 'No', '80A TP', NULL, 0, 0),
('2-041200-0110', 'AC Requirements', 'WP Isolators', 'WP isolator 100A TP', 'Weatherproof isolator surface mounted', 'No', '100A TP', NULL, 0, 0),
('2-041200-0111', 'AC Requirements', 'WP Isolators', 'WP isolator 125A TP', 'Weatherproof isolator surface mounted', 'No', '125A TP', NULL, 0, 0);

-- FLOOR BOXES
INSERT INTO public.takeoff_catalog (item_code, category, sub_category, name, description, unit, conduit_size, conduit_type, default_vertical_drop, waste_percentage) VALUES
('2-041300-0101', 'Floor Boxes', 'Cabstrut 9-way', 'Cabstrut 9-way floor box', 'Cabstrut 9-way flush floor box with cover', 'No', NULL, NULL, 0, 0),
('2-041300-0102', 'Floor Boxes', 'Cabstrut 9-way', 'Floor box 16A SSO', '16A switched socket for floor box', 'No', NULL, NULL, 0, 0),
('2-041300-0103', 'Floor Boxes', 'Cabstrut 9-way', 'Floor box 16A ded SSO', '16A dedicated switched socket for floor box', 'No', NULL, NULL, 0, 0),
('2-041300-0104', 'Floor Boxes', 'Cabstrut 9-way', 'Floor box data cover', 'Data cover for floor box', 'No', NULL, NULL, 0, 0),
('2-041300-0201', 'Floor Boxes', 'GRAF9', 'GRAF9 floor box', 'O-line GRAF9 flush floor box', 'No', NULL, NULL, 0, 0);

-- GEYSERS
INSERT INTO public.takeoff_catalog (item_code, category, sub_category, name, description, unit, conduit_size, conduit_type, default_vertical_drop, waste_percentage) VALUES
('2-041400-0101', 'Geysers', 'General', 'Geyser connection 20A', 'Final connection to geyser with flexible connection', 'No', '20A', NULL, 0, 0),
('2-041400-0102', 'Geysers', 'General', 'Geyser connection 20A DP', 'Final connection 20A DP', 'No', '20A DP', NULL, 0, 0);

-- ISOLATORS
INSERT INTO public.takeoff_catalog (item_code, category, sub_category, name, description, unit, conduit_size, conduit_type, default_vertical_drop, waste_percentage) VALUES
('2-041500-0101', 'Isolators', 'Weatherproof', 'WP isolator 20A DP', 'Weatherproof isolator surface mounted', 'No', '20A DP', NULL, 0, 0),
('2-041500-0102', 'Isolators', 'Weatherproof', 'WP isolator 45A TP', 'Weatherproof isolator surface mounted', 'No', '45A TP', NULL, 0, 0),
('2-041500-0103', 'Isolators', 'Weatherproof', 'WP isolator 100A TP', 'Weatherproof isolator surface mounted', 'No', '100A TP', NULL, 0, 0),
('2-041500-0201', 'Isolators', 'IP65 Rated', 'IP65 isolator 25A DP', 'Surface mounted IP65 rated', 'No', '25A DP', NULL, 0, 0),
('2-041500-0301', 'Isolators', 'Flush/Surface', 'Flush isolator 20A DP', 'Flush or surface box', 'No', '20A DP', NULL, 0, 0),
('2-041500-0302', 'Isolators', 'Flush/Surface', 'Flush isolator 25A DP', 'Flush or surface box', 'No', '25A DP', NULL, 0, 0),
('2-041500-0303', 'Isolators', 'Flush/Surface', 'Flush isolator 30A TP', 'Flush or surface box', 'No', '30A TP', NULL, 0, 0),
('2-041500-0304', 'Isolators', 'Flush/Surface', 'Flush isolator 32A DP', 'Flush or surface box', 'No', '32A DP', NULL, 0, 0),
('2-041500-0305', 'Isolators', 'Flush/Surface', 'Flush isolator 32A TP', 'Flush or surface box', 'No', '32A TP', NULL, 0, 0),
('2-041500-0306', 'Isolators', 'Flush/Surface', 'Flush isolator 60A TP', 'Flush or surface box', 'No', '60A TP', NULL, 0, 0),
('2-041500-0307', 'Isolators', 'Flush/Surface', 'Flush isolator 63A TP', 'Flush or surface box', 'No', '63A TP', NULL, 0, 0),
('2-041500-0308', 'Isolators', 'Flush/Surface', 'Flush isolator 80A TP', 'Flush or surface box', 'No', '80A TP', NULL, 0, 0);

-- LV CABLE ON TRAY/TRUNKING
INSERT INTO public.takeoff_catalog (item_code, category, sub_category, name, description, unit, conduit_size, conduit_type, default_vertical_drop, waste_percentage) VALUES
('2-041800-0101', 'LV Cable', 'On Cable Tray/Trunking', 'LV cable 4C x 35mm² (tray)', 'Copper 600/1000V Grade (ECC)', 'm', '4C x 35mm²', 'Copper', 0, 0.05),
('2-041800-0102', 'LV Cable', 'On Cable Tray/Trunking', 'LV cable 4C x 25mm² (tray)', 'Copper 600/1000V Grade (ECC)', 'm', '4C x 25mm²', 'Copper', 0, 0.05),
('2-041800-0103', 'LV Cable', 'On Cable Tray/Trunking', 'LV cable 4C x 16mm² (tray)', 'Copper 600/1000V Grade (ECC)', 'm', '4C x 16mm²', 'Copper', 0, 0.05),
('2-041800-0104', 'LV Cable', 'On Cable Tray/Trunking', 'LV cable 4C x 10mm² (tray)', 'Copper 600/1000V Grade (ECC)', 'm', '4C x 10mm²', 'Copper', 0, 0.05),
('2-041800-0105', 'LV Cable', 'On Cable Tray/Trunking', 'LV cable 4C x 6mm² (tray)', 'Copper 600/1000V Grade (ECC)', 'm', '4C x 6mm²', 'Copper', 0, 0.05),
('2-041800-0106', 'LV Cable', 'On Cable Tray/Trunking', 'LV cable 4C x 4mm² (tray)', 'Copper 600/1000V Grade (ECC)', 'm', '4C x 4mm²', 'Copper', 0, 0.05);

-- LV CABLE IN GROUND (Copper)
INSERT INTO public.takeoff_catalog (item_code, category, sub_category, name, description, unit, conduit_size, conduit_type, default_vertical_drop, waste_percentage) VALUES
('2-041900-0101', 'LV Cable', 'In Ground/Sleeves (Copper)', 'LV cable 4C x 185mm² Cu', 'Copper 600/1000V PVC/SWA/ECC', 'm', '4C x 185mm²', 'Copper', 0, 0.05),
('2-041900-0102', 'LV Cable', 'In Ground/Sleeves (Copper)', 'LV cable 4C x 150mm² Cu', 'Copper 600/1000V PVC/SWA/ECC', 'm', '4C x 150mm²', 'Copper', 0, 0.05),
('2-041900-0103', 'LV Cable', 'In Ground/Sleeves (Copper)', 'LV cable 4C x 120mm² Cu', 'Copper 600/1000V PVC/SWA/ECC', 'm', '4C x 120mm²', 'Copper', 0, 0.05),
('2-041900-0104', 'LV Cable', 'In Ground/Sleeves (Copper)', 'LV cable 4C x 95mm² Cu', 'Copper 600/1000V PVC/SWA/ECC', 'm', '4C x 95mm²', 'Copper', 0, 0.05),
('2-041900-0105', 'LV Cable', 'In Ground/Sleeves (Copper)', 'LV cable 4C x 70mm² Cu', 'Copper 600/1000V PVC/SWA/ECC', 'm', '4C x 70mm²', 'Copper', 0, 0.05),
('2-041900-0106', 'LV Cable', 'In Ground/Sleeves (Copper)', 'LV cable 4C x 50mm² Cu', 'Copper 600/1000V PVC/SWA/ECC', 'm', '4C x 50mm²', 'Copper', 0, 0.05),
('2-041900-0107', 'LV Cable', 'In Ground/Sleeves (Copper)', 'LV cable 4C x 35mm² Cu', 'Copper 600/1000V PVC/SWA/ECC', 'm', '4C x 35mm²', 'Copper', 0, 0.05),
('2-041900-0108', 'LV Cable', 'In Ground/Sleeves (Copper)', 'LV cable 4C x 25mm² Cu', 'Copper 600/1000V PVC/SWA/ECC', 'm', '4C x 25mm²', 'Copper', 0, 0.05),
('2-041900-0109', 'LV Cable', 'In Ground/Sleeves (Copper)', 'LV cable 4C x 16mm² Cu', 'Copper 600/1000V PVC/SWA/ECC', 'm', '4C x 16mm²', 'Copper', 0, 0.05),
('2-041900-0110', 'LV Cable', 'In Ground/Sleeves (Copper)', 'LV cable 4C x 10mm² Cu', 'Copper 600/1000V PVC/SWA/ECC', 'm', '4C x 10mm²', 'Copper', 0, 0.05),
('2-041900-0111', 'LV Cable', 'In Ground/Sleeves (Copper)', 'LV cable 4C x 6mm² Cu', 'Copper 600/1000V PVC/SWA/ECC', 'm', '4C x 6mm²', 'Copper', 0, 0.05),
('2-041900-0112', 'LV Cable', 'In Ground/Sleeves (Copper)', 'LV cable 4C x 4mm² Cu', 'Copper 600/1000V PVC/SWA/ECC', 'm', '4C x 4mm²', 'Copper', 0, 0.05);

-- LV CABLE (Aluminium)
INSERT INTO public.takeoff_catalog (item_code, category, sub_category, name, description, unit, conduit_size, conduit_type, default_vertical_drop, waste_percentage) VALUES
('2-041900-0201', 'LV Cable', 'In Ground/Sleeves (Aluminium)', 'LV cable 4C x 240mm² Al', 'Aluminium 600/1000V PVC/SWA/ECC SANS 1507', 'm', '4C x 240mm²', 'Aluminium', 0, 0.05),
('2-041900-0202', 'LV Cable', 'In Ground/Sleeves (Aluminium)', 'LV cable 4C x 185mm² Al', 'Aluminium SANS 1507', 'm', '4C x 185mm²', 'Aluminium', 0, 0.05),
('2-041900-0203', 'LV Cable', 'In Ground/Sleeves (Aluminium)', 'LV cable 4C x 150mm² Al', 'Aluminium SANS 1507', 'm', '4C x 150mm²', 'Aluminium', 0, 0.05),
('2-041900-0204', 'LV Cable', 'In Ground/Sleeves (Aluminium)', 'LV cable 4C x 120mm² Al', 'Aluminium SANS 1507', 'm', '4C x 120mm²', 'Aluminium', 0, 0.05),
('2-041900-0205', 'LV Cable', 'In Ground/Sleeves (Aluminium)', 'LV cable 4C x 95mm² Al', 'Aluminium SANS 1507', 'm', '4C x 95mm²', 'Aluminium', 0, 0.05),
('2-041900-0206', 'LV Cable', 'In Ground/Sleeves (Aluminium)', 'LV cable 4C x 70mm² Al', 'Aluminium SANS 1507', 'm', '4C x 70mm²', 'Aluminium', 0, 0.05),
('2-041900-0207', 'LV Cable', 'In Ground/Sleeves (Aluminium)', 'LV cable 4C x 50mm² Al', 'Aluminium SANS 1507', 'm', '4C x 50mm²', 'Aluminium', 0, 0.05),
('2-041900-0208', 'LV Cable', 'In Ground/Sleeves (Aluminium)', 'LV cable 4C x 35mm² Al', 'Aluminium SANS 1507', 'm', '4C x 35mm²', 'Aluminium', 0, 0.05),
('2-041900-0209', 'LV Cable', 'In Ground/Sleeves (Aluminium)', 'LV cable 4C x 25mm² Al', 'Aluminium SANS 1507', 'm', '4C x 25mm²', 'Aluminium', 0, 0.05);

-- POWER POLES
INSERT INTO public.takeoff_catalog (item_code, category, sub_category, name, description, unit, conduit_size, conduit_type, default_vertical_drop, waste_percentage) VALUES
('2-042200-0101', 'Power Poles', 'General', 'Power pole 2-comp', 'O-Line two-compartment service pole with PVC cover', 'No', NULL, NULL, 0, 0),
('2-042200-0201', 'Power Poles', 'Appliances', 'Power pole 16A SSO', '16A 3-pin SSO on power pole', 'No', NULL, NULL, 0, 0),
('2-042200-0401', 'Power Poles', 'O-Line', '3.4m power pole', 'O-Line power pole', 'No', NULL, NULL, 0, 0),
('2-042200-0402', 'Power Poles', 'O-Line', 'PP 16A normal SSO', '16A normal (white) SSO on pole', 'No', NULL, NULL, 0, 0),
('2-042200-0403', 'Power Poles', 'O-Line', 'PP 16A dedicated SSO', '16A dedicated (red) SSO on pole', 'No', NULL, NULL, 0, 0),
('2-042200-0405', 'Power Poles', 'O-Line', 'PP data outlet', 'Data outlet on power pole', 'No', NULL, NULL, 0, 0);

-- POWER SKIRTING
INSERT INTO public.takeoff_catalog (item_code, category, sub_category, name, description, unit, conduit_size, conduit_type, default_vertical_drop, waste_percentage) VALUES
('2-042300-0101', 'Power Skirting', '3-comp 2-cover', 'PS straight', 'Three-compartment two-cover on brickwork', 'm', NULL, NULL, 0, 0.05),
('2-042300-0102', 'Power Skirting', '3-comp 2-cover', 'PS vertical bend', 'Vertical bends', 'No', NULL, NULL, 0, 0),
('2-042300-0103', 'Power Skirting', '3-comp 2-cover', 'PS end cap', 'End caps', 'No', NULL, NULL, 0, 0),
('2-042300-0204', 'Power Skirting', 'O-Line PM2', 'PM2 16A normal SSO', '16A normal SSO on skirting', 'No', NULL, NULL, 0, 0),
('2-042300-0205', 'Power Skirting', 'O-Line PM2', 'PM2 16A ded SSO', '16A dedicated SSO on skirting', 'No', NULL, NULL, 0, 0),
('2-042300-0206', 'Power Skirting', 'O-Line PM2', 'PM2 USB outlet', '5A and 2.5A USB outlet', 'No', NULL, NULL, 0, 0);

-- STRIP CONNECTORS
INSERT INTO public.takeoff_catalog (item_code, category, sub_category, name, description, unit, conduit_size, conduit_type, default_vertical_drop, waste_percentage) VALUES
('2-042400-0101', 'Strip Connectors', 'General', '16A strip connector', 'Supply and install 16A strip connector', 'No', NULL, NULL, 0, 0);

-- TRUNKING
INSERT INTO public.takeoff_catalog (item_code, category, sub_category, name, description, unit, conduit_size, conduit_type, default_vertical_drop, waste_percentage) VALUES
('2-042500-0101', 'Trunking', 'Chased in Floor', 'P2 200 straight', 'P2 200 in concrete floor', 'm', 'P2 200', NULL, 0, 0.05),
('2-042600-0101', 'Trunking', 'Shop Ceiling to DB', 'P8000 straight', 'Galv trunking vertical', 'm', 'P8000', 'Galvanised', 0, 0.05),
('2-042700-0101', 'Trunking', 'DB Entry', 'P9000 trunking', 'Epoxy coated white with cover', 'm', 'P9000', NULL, 0, 0.05);

-- WIRE BASKET
INSERT INTO public.takeoff_catalog (item_code, category, sub_category, name, description, unit, conduit_size, conduit_type, default_vertical_drop, waste_percentage) VALUES
('2-042800-0101', 'Wire Basket', 'General', '200mm WB straight', '200mm wide suspended from steel trusses', 'm', '200mm', NULL, 0, 0.05),
('2-042800-0102', 'Wire Basket', 'General', '200mm WB horiz bend', 'Horizontal bends', 'No', '200mm', NULL, 0, 0),
('2-042800-0103', 'Wire Basket', 'General', '200mm WB vert bend', 'Vertical bends', 'No', '200mm', NULL, 0, 0),
('2-042800-0104', 'Wire Basket', 'General', '200mm WB T-piece', 'T-pieces', 'No', '200mm', NULL, 0, 0);

-- WIRING TRUNKING
INSERT INTO public.takeoff_catalog (item_code, category, sub_category, name, description, unit, conduit_size, conduit_type, default_vertical_drop, waste_percentage) VALUES
('2-042900-0101', 'Wiring Trunking', 'Galvanised', 'P9000 straight', 'Galv trunking with cover', 'm', 'P9000', 'Galvanised', 0, 0.05),
('2-042900-0102', 'Wiring Trunking', 'Galvanised', 'P8000 straight', 'Galv trunking with cover', 'm', 'P8000', 'Galvanised', 0, 0.05),
('2-042900-0103', 'Wiring Trunking', 'Galvanised', 'P2000 straight', 'Galv trunking with cover', 'm', 'P2000', 'Galvanised', 0, 0.05),
('2-042900-0104', 'Wiring Trunking', 'Galvanised', 'P9000 corner', 'Corners', 'No', 'P9000', 'Galvanised', 0, 0),
('2-042900-0107', 'Wiring Trunking', 'Galvanised', 'P9000 T-piece', 'T-pieces', 'No', 'P9000', 'Galvanised', 0, 0);

-- SLEEVES & TRENCHING
INSERT INTO public.takeoff_catalog (item_code, category, sub_category, name, description, unit, conduit_size, conduit_type, default_vertical_drop, waste_percentage) VALUES
('2-050100-0101', 'Sleeves & Trenching', 'Trenching 300x600', 'Soft ground trenching', 'Soft pickable ground', 'm³', NULL, NULL, 0, 0),
('2-050100-0102', 'Sleeves & Trenching', 'Trenching 300x600', 'Hard ground trenching', 'Hard pickable ground', 'm³', NULL, NULL, 0, 0),
('2-050100-0104', 'Sleeves & Trenching', 'Trenching 300x600', 'Sand filling', 'Sand filling', 'm³', NULL, NULL, 0, 0),
('2-050200-0105', 'Sleeves & Trenching', 'Cable Sleeves', '50mm Nextube sleeve', '50mm Nextube sleeve', 'm', '50mm', 'Nextube', 0, 0.05),
('2-050200-0106', 'Sleeves & Trenching', 'Cable Sleeves', '100mm Nextube sleeve', '100mm Nextube cable sleeve', 'm', '100mm', 'Nextube', 0, 0.05),
('2-050200-0107', 'Sleeves & Trenching', 'Cable Sleeves', '150mm Nextube sleeve', '150mm Nextube cable sleeve', 'm', '150mm', 'Nextube', 0, 0.05),
('2-050500-0101', 'Sleeves & Trenching', 'Electrical Sleeves', '50mm Nextube in trench', 'In trench or on cable tray', 'm', '50mm', 'Nextube', 0, 0.05),
('2-050500-0102', 'Sleeves & Trenching', 'Electrical Sleeves', '110mm Nextube in trench', 'In trench or on cable tray', 'm', '110mm', 'Nextube', 0, 0.05),
('2-050500-0103', 'Sleeves & Trenching', 'Electrical Sleeves', '160mm Nextube in trench', 'In trench or on cable tray', 'm', '160mm', 'Nextube', 0, 0.05);

-- SECURITY & DATA
INSERT INTO public.takeoff_catalog (item_code, category, sub_category, name, description, unit, conduit_size, conduit_type, default_vertical_drop, waste_percentage) VALUES
('2-070000-0101', 'Security & Data', 'Telephone Board', 'Tel board 400x400', 'Surface telephone board 400x400', 'No', '400x400', NULL, 0, 0),
('2-070000-0102', 'Security & Data', 'Telephone Board', 'Tel board 600x600', 'Surface telephone board 600x600', 'No', '600x600', NULL, 0, 0),
('2-070000-0103', 'Security & Data', 'Telephone Board', 'Tel board 1000x1000', 'Surface telephone board 1000x1000', 'No', '1000x1000', NULL, 0, 0);

-- LABELLING
INSERT INTO public.takeoff_catalog (item_code, category, sub_category, name, description, unit, conduit_size, conduit_type, default_vertical_drop, waste_percentage) VALUES
('2-130000-0101', 'Labelling', 'General', 'Label all DBs', 'Label all distribution boards', 'Sum', NULL, NULL, 0, 0),
('2-130000-0102', 'Labelling', 'General', 'Label all outlets', 'Label all visible outlets', 'Sum', NULL, NULL, 0, 0);

-- LABOUR
INSERT INTO public.takeoff_catalog (item_code, category, sub_category, name, description, unit, conduit_size, conduit_type, default_vertical_drop, waste_percentage) VALUES
('2-140000-0101', 'Labour', 'Electrician', 'Electrician normal time', 'Day works rate', 'hrs', NULL, NULL, 0, 0),
('2-140000-0102', 'Labour', 'Electrician', 'Electrician overtime', 'Day works rate', 'hrs', NULL, NULL, 0, 0),
('2-140000-0103', 'Labour', 'Electrician', 'Electrician Saturday', 'Day works rate', 'hrs', NULL, NULL, 0, 0),
('2-140000-0104', 'Labour', 'Electrician', 'Electrician Sunday', 'Day works rate', 'hrs', NULL, NULL, 0, 0),
('2-140000-0105', 'Labour', 'Conduit Installer', 'Conduit installer normal', 'Day works rate', 'hrs', NULL, NULL, 0, 0),
('2-140000-0109', 'Labour', 'Labourer', 'Labourer normal time', 'Day works rate', 'hrs', NULL, NULL, 0, 0);

-- MANHOLES
INSERT INTO public.takeoff_catalog (item_code, category, sub_category, name, description, unit, conduit_size, conduit_type, default_vertical_drop, waste_percentage) VALUES
('2-150000-0101', 'Manholes', 'General', 'Polymer manhole 600x600', 'Medium duty polymer pre-fabricated round 600mm x 600mm', 'No', '600x600', NULL, 0, 0);
