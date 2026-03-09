
CREATE TABLE public.takeoff_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL DEFAULT 'Devices',
  name text NOT NULL,
  conduit_size text,
  conduit_type text,
  unit text NOT NULL DEFAULT 'EA',
  default_vertical_drop float DEFAULT 0,
  waste_percentage float DEFAULT 0.05,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.takeoff_assemblies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  icon_svg text,
  color text DEFAULT '#3b82f6',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.takeoff_assembly_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assembly_id uuid REFERENCES public.takeoff_assemblies(id) ON DELETE CASCADE NOT NULL,
  catalog_id uuid REFERENCES public.takeoff_catalog(id) ON DELETE CASCADE NOT NULL,
  quantity float NOT NULL DEFAULT 1
);

CREATE TABLE public.takeoffs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  drawing_id uuid,
  name text NOT NULL DEFAULT 'Untitled Takeoff',
  scale_ratio float,
  measurement_unit text NOT NULL DEFAULT 'meters',
  status text NOT NULL DEFAULT 'draft',
  created_by text,
  created_by_email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.takeoff_zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  takeoff_id uuid REFERENCES public.takeoffs(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL DEFAULT 'Zone',
  polygon jsonb NOT NULL DEFAULT '[]',
  color text DEFAULT '#f59e0b',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.takeoff_measurements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  takeoff_id uuid REFERENCES public.takeoffs(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL DEFAULT 'count',
  assembly_id uuid REFERENCES public.takeoff_assemblies(id),
  catalog_id uuid REFERENCES public.takeoff_catalog(id),
  zone_id uuid REFERENCES public.takeoff_zones(id) ON DELETE SET NULL,
  remarks text,
  source_reference text,
  x_pos float,
  y_pos float,
  points jsonb,
  measured_length float,
  final_quantity float,
  vertical_drop_total float DEFAULT 0,
  waste_added float DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.takeoff_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.takeoff_assemblies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.takeoff_assembly_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.takeoffs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.takeoff_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.takeoff_measurements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read catalog" ON public.takeoff_catalog FOR SELECT USING (true);
CREATE POLICY "Auth users manage catalog" ON public.takeoff_catalog FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can read assemblies" ON public.takeoff_assemblies FOR SELECT USING (true);
CREATE POLICY "Auth users manage assemblies" ON public.takeoff_assemblies FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can read assembly items" ON public.takeoff_assembly_items FOR SELECT USING (true);
CREATE POLICY "Auth users manage assembly items" ON public.takeoff_assembly_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Auth users manage own takeoffs" ON public.takeoffs FOR ALL TO authenticated
  USING (public.user_has_project_access(project_id)) WITH CHECK (public.user_has_project_access(project_id));
CREATE POLICY "Contractors read takeoffs" ON public.takeoffs FOR SELECT TO anon
  USING (public.has_valid_contractor_portal_token(project_id));
CREATE POLICY "Contractors create takeoffs" ON public.takeoffs FOR INSERT TO anon
  WITH CHECK (public.has_valid_contractor_portal_token(project_id));
CREATE POLICY "Contractors update own takeoffs" ON public.takeoffs FOR UPDATE TO anon
  USING (public.has_valid_contractor_portal_token(project_id));

CREATE POLICY "Auth users manage zones" ON public.takeoff_zones FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.takeoffs t WHERE t.id = takeoff_id AND public.user_has_project_access(t.project_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.takeoffs t WHERE t.id = takeoff_id AND public.user_has_project_access(t.project_id)));
CREATE POLICY "Contractors manage zones" ON public.takeoff_zones FOR ALL TO anon
  USING (EXISTS (SELECT 1 FROM public.takeoffs t WHERE t.id = takeoff_id AND public.has_valid_contractor_portal_token(t.project_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.takeoffs t WHERE t.id = takeoff_id AND public.has_valid_contractor_portal_token(t.project_id)));

CREATE POLICY "Auth users manage measurements" ON public.takeoff_measurements FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.takeoffs t WHERE t.id = takeoff_id AND public.user_has_project_access(t.project_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.takeoffs t WHERE t.id = takeoff_id AND public.user_has_project_access(t.project_id)));
CREATE POLICY "Contractors manage measurements" ON public.takeoff_measurements FOR ALL TO anon
  USING (EXISTS (SELECT 1 FROM public.takeoffs t WHERE t.id = takeoff_id AND public.has_valid_contractor_portal_token(t.project_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.takeoffs t WHERE t.id = takeoff_id AND public.has_valid_contractor_portal_token(t.project_id)));

INSERT INTO public.takeoff_catalog (category, name, unit, default_vertical_drop, waste_percentage) VALUES
  ('Devices', 'Single Switch', 'EA', 2.4, 0),
  ('Devices', 'Double Switch', 'EA', 2.4, 0),
  ('Devices', 'Duplex Receptacle', 'EA', 0.3, 0),
  ('Devices', 'Single Socket Outlet', 'EA', 0.3, 0),
  ('Devices', 'Double Socket Outlet', 'EA', 0.3, 0),
  ('Devices', 'Data Point (Cat6)', 'EA', 2.4, 0),
  ('Devices', 'TV Point', 'EA', 0.3, 0),
  ('Devices', 'Smoke Detector', 'EA', 0, 0),
  ('Devices', 'Emergency Light', 'EA', 0, 0),
  ('Devices', 'Exit Sign', 'EA', 0, 0),
  ('Devices', 'Motion Sensor', 'EA', 0, 0),
  ('Devices', 'Isolator Switch', 'EA', 0, 0);

INSERT INTO public.takeoff_catalog (category, name, unit, default_vertical_drop, waste_percentage) VALUES
  ('Fixtures', 'Downlight LED', 'EA', 0, 0),
  ('Fixtures', 'Fluorescent 1200mm', 'EA', 0, 0),
  ('Fixtures', 'Panel Light 600x600', 'EA', 0, 0),
  ('Fixtures', 'Bulkhead Light', 'EA', 0, 0),
  ('Fixtures', 'Floodlight', 'EA', 0, 0),
  ('Fixtures', 'Strip Light LED', 'EA', 0, 0);

INSERT INTO public.takeoff_catalog (category, name, unit, default_vertical_drop, waste_percentage, conduit_size, conduit_type) VALUES
  ('Conduit', '20mm PVC Conduit', 'LM', 0, 0.05, '20mm', 'PVC'),
  ('Conduit', '25mm PVC Conduit', 'LM', 0, 0.05, '25mm', 'PVC'),
  ('Conduit', '32mm PVC Conduit', 'LM', 0, 0.05, '32mm', 'PVC'),
  ('Conduit', '20mm Galv Conduit', 'LM', 0, 0.05, '20mm', 'Galvanised'),
  ('Conduit', '25mm Galv Conduit', 'LM', 0, 0.05, '25mm', 'Galvanised');

INSERT INTO public.takeoff_catalog (category, name, unit, default_vertical_drop, waste_percentage) VALUES
  ('Containment', '50x50 Trunking', 'LM', 0, 0.05),
  ('Containment', '100x50 Trunking', 'LM', 0, 0.05),
  ('Containment', '150x50 Trunking', 'LM', 0, 0.05),
  ('Containment', '300x50 Cable Tray', 'LM', 0, 0.05),
  ('Containment', '450x50 Cable Tray', 'LM', 0, 0.05);

INSERT INTO public.takeoff_catalog (category, name, unit, default_vertical_drop, waste_percentage) VALUES
  ('Cable', '1.5mm GP Twin+Earth', 'LM', 0, 0.05),
  ('Cable', '2.5mm GP Twin+Earth', 'LM', 0, 0.05),
  ('Cable', '4mm GP Twin+Earth', 'LM', 0, 0.05),
  ('Cable', '6mm GP Twin+Earth', 'LM', 0, 0.05),
  ('Cable', '16mm 4-Core SWA', 'LM', 0, 0.05),
  ('Cable', '25mm 4-Core SWA', 'LM', 0, 0.05),
  ('Cable', '35mm 4-Core SWA', 'LM', 0, 0.05);

INSERT INTO public.takeoff_catalog (category, name, unit, default_vertical_drop, waste_percentage) VALUES
  ('Accessories', 'Junction Box', 'EA', 0, 0),
  ('Accessories', 'Saddle Clip 20mm', 'EA', 0, 0),
  ('Accessories', 'Saddle Clip 25mm', 'EA', 0, 0),
  ('Accessories', 'Earth Rod + Clamp', 'EA', 0, 0);

INSERT INTO public.takeoff_assemblies (name, icon_svg, color) VALUES
  ('Single Switch Assembly', 'toggle-left', '#3b82f6'),
  ('Double Switch Assembly', 'toggle-right', '#3b82f6'),
  ('Socket Outlet Assembly', 'plug', '#ef4444'),
  ('Data Point Assembly', 'network', '#10b981'),
  ('Light Point', 'lightbulb', '#f59e0b');
