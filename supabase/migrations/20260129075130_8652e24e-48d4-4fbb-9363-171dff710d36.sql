-- ============================================
-- Drawing Review Checklist System
-- ============================================

-- 1. Checklist Templates (one per drawing category)
CREATE TABLE public.drawing_checklist_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_default BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. Checklist Items (hierarchical items within templates)
CREATE TABLE public.drawing_checklist_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES public.drawing_checklist_templates(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  parent_id UUID REFERENCES public.drawing_checklist_items(id) ON DELETE CASCADE,
  linked_document_type TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. Drawing Review Status (one per drawing)
CREATE TABLE public.drawing_review_status (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  drawing_id UUID NOT NULL REFERENCES public.project_drawings(id) ON DELETE CASCADE,
  reviewed_by UUID,
  review_date TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'approved')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(drawing_id)
);

-- 4. Drawing Review Checks (individual item checks)
CREATE TABLE public.drawing_review_checks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  review_id UUID NOT NULL REFERENCES public.drawing_review_status(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.drawing_checklist_items(id) ON DELETE CASCADE,
  is_checked BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  checked_at TIMESTAMP WITH TIME ZONE,
  checked_by UUID,
  UNIQUE(review_id, item_id)
);

-- Enable RLS on all tables
ALTER TABLE public.drawing_checklist_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drawing_checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drawing_review_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drawing_review_checks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for templates (all authenticated users can read)
CREATE POLICY "Anyone can view checklist templates"
ON public.drawing_checklist_templates FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can manage templates"
ON public.drawing_checklist_templates FOR ALL
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- RLS Policies for items
CREATE POLICY "Anyone can view checklist items"
ON public.drawing_checklist_items FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can manage items"
ON public.drawing_checklist_items FOR ALL
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- RLS Policies for review status
CREATE POLICY "Anyone can view review status"
ON public.drawing_review_status FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can manage review status"
ON public.drawing_review_status FOR ALL
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- RLS Policies for review checks
CREATE POLICY "Anyone can view review checks"
ON public.drawing_review_checks FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can manage review checks"
ON public.drawing_review_checks FOR ALL
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- Create indexes for performance
CREATE INDEX idx_checklist_items_template ON public.drawing_checklist_items(template_id);
CREATE INDEX idx_checklist_items_parent ON public.drawing_checklist_items(parent_id);
CREATE INDEX idx_review_status_drawing ON public.drawing_review_status(drawing_id);
CREATE INDEX idx_review_checks_review ON public.drawing_review_checks(review_id);

-- Update timestamp trigger
CREATE TRIGGER update_drawing_checklist_templates_updated_at
BEFORE UPDATE ON public.drawing_checklist_templates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_drawing_review_status_updated_at
BEFORE UPDATE ON public.drawing_review_status
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- SEED DEFAULT CHECKLIST DATA
-- ============================================

-- Site Plan Template
INSERT INTO public.drawing_checklist_templates (id, category_code, name, description) VALUES
('11111111-1111-1111-1111-111111111111', 'site', 'Site Plan Check Sheet', 'Standard checklist for site plan drawings');

-- Site Plan Items (19 items)
INSERT INTO public.drawing_checklist_items (template_id, label, sort_order) VALUES
('11111111-1111-1111-1111-111111111111', 'Access control detail - booms at entrances', 1),
('11111111-1111-1111-1111-111111111111', 'Lighting circuiting', 2),
('11111111-1111-1111-1111-111111111111', 'Generator plinth details', 3),
('11111111-1111-1111-1111-111111111111', 'Anchor supply routing', 4),
('11111111-1111-1111-1111-111111111111', 'North arrow to be indicated', 5),
('11111111-1111-1111-1111-111111111111', 'MV cable between council and consumer RMU', 6),
('11111111-1111-1111-1111-111111111111', 'Routing to electrical connection', 7),
('11111111-1111-1111-1111-111111111111', 'Sleeves for electrified fence', 8),
('11111111-1111-1111-1111-111111111111', 'Landscaping sleeves', 9),
('11111111-1111-1111-1111-111111111111', 'Sleeve schedule', 10),
('11111111-1111-1111-1111-111111111111', 'Parking area lights', 11),
('11111111-1111-1111-1111-111111111111', 'Kiosk positions', 12),
('11111111-1111-1111-1111-111111111111', 'Lighting schedule', 13),
('11111111-1111-1111-1111-111111111111', 'Lighting specification', 14),
('11111111-1111-1111-1111-111111111111', 'Telecom routing', 15),
('11111111-1111-1111-1111-111111111111', 'Generator positions', 16),
('11111111-1111-1111-1111-111111111111', 'Telkom/Meet me room position', 17),
('11111111-1111-1111-1111-111111111111', 'Mini sub positions', 18),
('11111111-1111-1111-1111-111111111111', 'Main board positions', 19),
('11111111-1111-1111-1111-111111111111', 'Electrical connection position', 20);

-- Power Layouts Template
INSERT INTO public.drawing_checklist_templates (id, category_code, name, description) VALUES
('22222222-2222-2222-2222-222222222222', 'power', 'Power Layouts Check Sheet', 'Standard checklist for power layout drawings');

-- Power Layout Items with hierarchy
DO $$
DECLARE
  fire_cupboard_id UUID;
  legend_id UUID;
  title_block_id UUID;
  shop_boards_id UUID;
  lifts_id UUID;
BEGIN
  -- Parent items
  INSERT INTO public.drawing_checklist_items (id, template_id, label, sort_order) VALUES
  (gen_random_uuid(), '22222222-2222-2222-2222-222222222222', 'Fire cupboard detail', 1) RETURNING id INTO fire_cupboard_id;
  
  INSERT INTO public.drawing_checklist_items (template_id, label, parent_id, sort_order) VALUES
  ('22222222-2222-2222-2222-222222222222', 'Plug in fire hose reel cupboards', fire_cupboard_id, 1);
  
  INSERT INTO public.drawing_checklist_items (id, template_id, label, sort_order) VALUES
  (gen_random_uuid(), '22222222-2222-2222-2222-222222222222', 'Legend', 2) RETURNING id INTO legend_id;
  
  INSERT INTO public.drawing_checklist_items (template_id, label, parent_id, sort_order) VALUES
  ('22222222-2222-2222-2222-222222222222', 'Check notes on title block', legend_id, 1),
  ('22222222-2222-2222-2222-222222222222', 'Check legend items', legend_id, 2);
  
  INSERT INTO public.drawing_checklist_items (template_id, label, sort_order) VALUES
  ('22222222-2222-2222-2222-222222222222', 'Grid lines', 3),
  ('22222222-2222-2222-2222-222222222222', 'Break glass units', 4),
  ('22222222-2222-2222-2222-222222222222', 'Energizer isolators', 5);
  
  INSERT INTO public.drawing_checklist_items (id, template_id, label, sort_order) VALUES
  (gen_random_uuid(), '22222222-2222-2222-2222-222222222222', 'Title block check', 6) RETURNING id INTO title_block_id;
  
  INSERT INTO public.drawing_checklist_items (template_id, label, parent_id, sort_order) VALUES
  ('22222222-2222-2222-2222-222222222222', 'Author details', title_block_id, 1),
  ('22222222-2222-2222-2222-222222222222', 'Client name/logo', title_block_id, 2),
  ('22222222-2222-2222-2222-222222222222', 'Drawing name', title_block_id, 3);
  
  INSERT INTO public.drawing_checklist_items (template_id, label, sort_order) VALUES
  ('22222222-2222-2222-2222-222222222222', 'Key plan', 7),
  ('22222222-2222-2222-2222-222222222222', 'Sockets in main board cupboards', 8),
  ('22222222-2222-2222-2222-222222222222', 'Walkway/Mall - decoration plugs', 9);
  
  INSERT INTO public.drawing_checklist_items (id, template_id, label, sort_order) VALUES
  (gen_random_uuid(), '22222222-2222-2222-2222-222222222222', 'Shop boards', 10) RETURNING id INTO shop_boards_id;
  
  INSERT INTO public.drawing_checklist_items (template_id, label, parent_id, sort_order) VALUES
  ('22222222-2222-2222-2222-222222222222', 'Correct position', shop_boards_id, 1),
  ('22222222-2222-2222-2222-222222222222', 'Correct size', shop_boards_id, 2),
  ('22222222-2222-2222-2222-222222222222', 'AC controller draw box with 25mm conduit to ceiling void', shop_boards_id, 3),
  ('22222222-2222-2222-2222-222222222222', 'Fibre draw box with 25mm conduit to ceiling void', shop_boards_id, 4),
  ('22222222-2222-2222-2222-222222222222', 'P9000 trunking to ceiling void', shop_boards_id, 5),
  ('22222222-2222-2222-2222-222222222222', 'P8000 trunking to ceiling void', shop_boards_id, 6);
  
  INSERT INTO public.drawing_checklist_items (template_id, label, sort_order) VALUES
  ('22222222-2222-2222-2222-222222222222', 'Cable tray/wire basket notes with heights', 11);
  
  INSERT INTO public.drawing_checklist_items (id, template_id, label, sort_order) VALUES
  (gen_random_uuid(), '22222222-2222-2222-2222-222222222222', 'Isolators points for lifts', 12) RETURNING id INTO lifts_id;
  
  INSERT INTO public.drawing_checklist_items (template_id, label, parent_id, sort_order) VALUES
  ('22222222-2222-2222-2222-222222222222', '60A TP isolator at the top', lifts_id, 1),
  ('22222222-2222-2222-2222-222222222222', '20A SP isolator at the bottom for sump pump', lifts_id, 2);
  
  INSERT INTO public.drawing_checklist_items (template_id, label, sort_order) VALUES
  ('22222222-2222-2222-2222-222222222222', 'Isolators for shop signage', 13),
  ('22222222-2222-2222-2222-222222222222', 'Routes for mall lighting', 14),
  ('22222222-2222-2222-2222-222222222222', 'Ensure main boards are indicated to scale', 15);
END $$;

-- CCTV and Access Control Template
INSERT INTO public.drawing_checklist_templates (id, category_code, name, description) VALUES
('33333333-3333-3333-3333-333333333333', 'cctv', 'CCTV and Access Control Check Sheet', 'Standard checklist for CCTV and access control drawings');

DO $$
DECLARE
  cctv_points_id UUID;
  data_cabinets_id UUID;
  speakers_id UUID;
  booms_id UUID;
  fence_id UUID;
  control_room_id UUID;
BEGIN
  INSERT INTO public.drawing_checklist_items (template_id, label, sort_order) VALUES
  ('33333333-3333-3333-3333-333333333333', 'Issue of layouts to both parties', 1);
  
  INSERT INTO public.drawing_checklist_items (id, template_id, label, sort_order) VALUES
  (gen_random_uuid(), '33333333-3333-3333-3333-333333333333', 'CCTV points', 2) RETURNING id INTO cctv_points_id;
  
  INSERT INTO public.drawing_checklist_items (template_id, label, parent_id, sort_order) VALUES
  ('33333333-3333-3333-3333-333333333333', 'Images', cctv_points_id, 1),
  ('33333333-3333-3333-3333-333333333333', 'Sleeves to be indicated on site plan early for coordination with civil', cctv_points_id, 2),
  ('33333333-3333-3333-3333-333333333333', 'Conduit links', cctv_points_id, 3),
  ('33333333-3333-3333-3333-333333333333', 'Heights', cctv_points_id, 4);
  
  INSERT INTO public.drawing_checklist_items (id, template_id, label, sort_order) VALUES
  (gen_random_uuid(), '33333333-3333-3333-3333-333333333333', 'Data cabinets', 3) RETURNING id INTO data_cabinets_id;
  
  INSERT INTO public.drawing_checklist_items (template_id, label, parent_id, sort_order) VALUES
  ('33333333-3333-3333-3333-333333333333', 'Power required for each', data_cabinets_id, 1),
  ('33333333-3333-3333-3333-333333333333', 'Wire basket to also link these up', data_cabinets_id, 2);
  
  INSERT INTO public.drawing_checklist_items (id, template_id, label, sort_order) VALUES
  (gen_random_uuid(), '33333333-3333-3333-3333-333333333333', 'Speakers', 4) RETURNING id INTO speakers_id;
  
  INSERT INTO public.drawing_checklist_items (template_id, label, parent_id, sort_order) VALUES
  ('33333333-3333-3333-3333-333333333333', 'Conduit link', speakers_id, 1);
  
  INSERT INTO public.drawing_checklist_items (id, template_id, label, sort_order) VALUES
  (gen_random_uuid(), '33333333-3333-3333-3333-333333333333', 'Booms', 5) RETURNING id INTO booms_id;
  
  INSERT INTO public.drawing_checklist_items (template_id, label, parent_id, sort_order) VALUES
  ('33333333-3333-3333-3333-333333333333', 'Power', booms_id, 1),
  ('33333333-3333-3333-3333-333333333333', 'Data', booms_id, 2),
  ('33333333-3333-3333-3333-333333333333', 'Conduits', booms_id, 3),
  ('33333333-3333-3333-3333-333333333333', 'Details', booms_id, 4),
  ('33333333-3333-3333-3333-333333333333', 'Goose necks', booms_id, 5);
  
  INSERT INTO public.drawing_checklist_items (template_id, label, sort_order) VALUES
  ('33333333-3333-3333-3333-333333333333', 'Access control at centre management', 6);
  
  INSERT INTO public.drawing_checklist_items (id, template_id, label, sort_order) VALUES
  (gen_random_uuid(), '33333333-3333-3333-3333-333333333333', 'Electrified fencing', 7) RETURNING id INTO fence_id;
  
  INSERT INTO public.drawing_checklist_items (template_id, label, parent_id, sort_order) VALUES
  ('33333333-3333-3333-3333-333333333333', 'Energiser plug', fence_id, 1),
  ('33333333-3333-3333-3333-333333333333', 'Route to boundary', fence_id, 2),
  ('33333333-3333-3333-3333-333333333333', 'Entrance details at all gates', fence_id, 3);
  
  INSERT INTO public.drawing_checklist_items (id, template_id, label, sort_order) VALUES
  (gen_random_uuid(), '33333333-3333-3333-3333-333333333333', 'Control room', 8) RETURNING id INTO control_room_id;
  
  INSERT INTO public.drawing_checklist_items (template_id, label, parent_id, sort_order) VALUES
  ('33333333-3333-3333-3333-333333333333', 'Points and the rest', control_room_id, 1);
END $$;

-- Tenant Layout Template
INSERT INTO public.drawing_checklist_templates (id, category_code, name, description) VALUES
('44444444-4444-4444-4444-444444444444', 'tenant', 'Tenant Layout Check Sheet', 'Standard checklist for tenant layout drawings');

DO $$
DECLARE
  power_layout_id UUID;
  lighting_layout_id UUID;
  schematic_id UUID;
  lighting_schedule_id UUID;
  scope_id UUID;
BEGIN
  INSERT INTO public.drawing_checklist_items (id, template_id, label, sort_order) VALUES
  (gen_random_uuid(), '44444444-4444-4444-4444-444444444444', 'Power layout section reflected', 1) RETURNING id INTO power_layout_id;
  
  INSERT INTO public.drawing_checklist_items (template_id, label, parent_id, sort_order) VALUES
  ('44444444-4444-4444-4444-444444444444', 'Correctly scaled board position with dimensions', power_layout_id, 1),
  ('44444444-4444-4444-4444-444444444444', 'Telkom point', power_layout_id, 2),
  ('44444444-4444-4444-4444-444444444444', 'AC point', power_layout_id, 3);
  
  INSERT INTO public.drawing_checklist_items (id, template_id, label, sort_order) VALUES
  (gen_random_uuid(), '44444444-4444-4444-4444-444444444444', 'Lighting layout section reflected', 2) RETURNING id INTO lighting_layout_id;
  
  INSERT INTO public.drawing_checklist_items (template_id, label, parent_id, sort_order) VALUES
  ('44444444-4444-4444-4444-444444444444', 'Trunking reflected with dimensions and height', lighting_layout_id, 1);
  
  INSERT INTO public.drawing_checklist_items (template_id, label, sort_order, linked_document_type) VALUES
  ('44444444-4444-4444-4444-444444444444', 'DB board elevation detail', 3, 'db_elevation');
  
  INSERT INTO public.drawing_checklist_items (id, template_id, label, sort_order, linked_document_type) VALUES
  (gen_random_uuid(), '44444444-4444-4444-4444-444444444444', 'Schematic distribution board indicated', 4, 'schematic_diagram') RETURNING id INTO schematic_id;
  
  INSERT INTO public.drawing_checklist_items (template_id, label, parent_id, sort_order) VALUES
  ('44444444-4444-4444-4444-444444444444', 'Correct and corresponding cable size reflected', schematic_id, 1),
  ('44444444-4444-4444-4444-444444444444', 'Correct board size reflected', schematic_id, 2),
  ('44444444-4444-4444-4444-444444444444', 'Circuit breakers align with circuits reflected on layouts', schematic_id, 3),
  ('44444444-4444-4444-4444-444444444444', 'Correct air-conditioning information reflected', schematic_id, 4);
  
  INSERT INTO public.drawing_checklist_items (template_id, label, sort_order) VALUES
  ('44444444-4444-4444-4444-444444444444', 'Key plan indicated with correct position', 5);
  
  INSERT INTO public.drawing_checklist_items (id, template_id, label, sort_order, linked_document_type) VALUES
  (gen_random_uuid(), '44444444-4444-4444-4444-444444444444', 'Lighting schedule reflected', 6, 'lighting_schedule') RETURNING id INTO lighting_schedule_id;
  
  INSERT INTO public.drawing_checklist_items (template_id, label, parent_id, sort_order) VALUES
  ('44444444-4444-4444-4444-444444444444', 'Images', lighting_schedule_id, 1),
  ('44444444-4444-4444-4444-444444444444', 'Description', lighting_schedule_id, 2),
  ('44444444-4444-4444-4444-444444444444', 'Supplier', lighting_schedule_id, 3),
  ('44444444-4444-4444-4444-444444444444', 'Quantity', lighting_schedule_id, 4);
  
  INSERT INTO public.drawing_checklist_items (template_id, label, sort_order) VALUES
  ('44444444-4444-4444-4444-444444444444', 'Single applicable legend indicated', 7);
  
  INSERT INTO public.drawing_checklist_items (id, template_id, label, sort_order, linked_document_type) VALUES
  (gen_random_uuid(), '44444444-4444-4444-4444-444444444444', 'Scope of work indicated', 8, 'scope_of_work') RETURNING id INTO scope_id;
  
  INSERT INTO public.drawing_checklist_items (template_id, label, parent_id, sort_order) VALUES
  ('44444444-4444-4444-4444-444444444444', 'Key points to be highlighted', scope_id, 1);
END $$;

-- Lighting Template (shares some items with power)
INSERT INTO public.drawing_checklist_templates (id, category_code, name, description) VALUES
('55555555-5555-5555-5555-555555555555', 'lighting', 'Lighting Layouts Check Sheet', 'Standard checklist for lighting layout drawings');

INSERT INTO public.drawing_checklist_items (template_id, label, sort_order) VALUES
('55555555-5555-5555-5555-555555555555', 'Lighting circuiting complete', 1),
('55555555-5555-5555-5555-555555555555', 'Lighting schedule reflected', 2),
('55555555-5555-5555-5555-555555555555', 'Emergency lighting indicated', 3),
('55555555-5555-5555-5555-555555555555', 'Exit signs positioned correctly', 4),
('55555555-5555-5555-5555-555555555555', 'Dimming zones indicated', 5),
('55555555-5555-5555-5555-555555555555', 'Control switches positioned', 6),
('55555555-5555-5555-5555-555555555555', 'Legend complete', 7),
('55555555-5555-5555-5555-555555555555', 'Grid lines indicated', 8),
('55555555-5555-5555-5555-555555555555', 'Title block complete', 9);