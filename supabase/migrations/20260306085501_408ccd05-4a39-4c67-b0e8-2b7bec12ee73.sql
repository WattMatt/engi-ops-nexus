
-- Enums
CREATE TYPE public.defect_status AS ENUM ('open', 'in_progress', 'resolved', 'closed');
CREATE TYPE public.defect_priority AS ENUM ('low', 'medium', 'high', 'critical');

-- Defect lists (observation categories per project)
CREATE TABLE public.defect_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_by_name TEXT,
  created_by_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Defect pins (core pin data)
CREATE TABLE public.defect_pins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  drawing_id UUID NOT NULL REFERENCES public.project_drawings(id) ON DELETE CASCADE,
  list_id UUID REFERENCES public.defect_lists(id) ON DELETE SET NULL,
  number_id INTEGER NOT NULL DEFAULT 1,
  x_percent NUMERIC NOT NULL,
  y_percent NUMERIC NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status public.defect_status NOT NULL DEFAULT 'open',
  priority public.defect_priority NOT NULL DEFAULT 'medium',
  package TEXT,
  markup_json JSONB,
  created_by_name TEXT NOT NULL,
  created_by_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Defect photos
CREATE TABLE public.defect_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pin_id UUID NOT NULL REFERENCES public.defect_pins(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  file_name TEXT,
  file_size INTEGER,
  uploaded_by_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Defect activity (audit trail)
CREATE TABLE public.defect_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pin_id UUID NOT NULL REFERENCES public.defect_pins(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  content TEXT,
  old_value TEXT,
  new_value TEXT,
  user_name TEXT NOT NULL,
  user_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_defect_pins_project ON public.defect_pins(project_id);
CREATE INDEX idx_defect_pins_drawing ON public.defect_pins(drawing_id);
CREATE INDEX idx_defect_photos_pin ON public.defect_photos(pin_id);
CREATE INDEX idx_defect_activity_pin ON public.defect_activity(pin_id);
CREATE INDEX idx_defect_lists_project ON public.defect_lists(project_id);

-- Auto number_id per drawing trigger
CREATE OR REPLACE FUNCTION public.assign_defect_number_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  SELECT COALESCE(MAX(number_id), 0) + 1
  INTO NEW.number_id
  FROM public.defect_pins
  WHERE drawing_id = NEW.drawing_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_assign_defect_number_id
  BEFORE INSERT ON public.defect_pins
  FOR EACH ROW EXECUTE FUNCTION public.assign_defect_number_id();

-- Updated_at trigger
CREATE TRIGGER trg_defect_pins_updated_at
  BEFORE UPDATE ON public.defect_pins
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- RLS
ALTER TABLE public.defect_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.defect_pins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.defect_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.defect_activity ENABLE ROW LEVEL SECURITY;

-- Anon policies (contractor portal)
CREATE POLICY "Anon select defect_lists" ON public.defect_lists FOR SELECT TO anon
  USING (public.has_valid_contractor_portal_token(project_id));
CREATE POLICY "Anon insert defect_lists" ON public.defect_lists FOR INSERT TO anon
  WITH CHECK (public.has_valid_contractor_portal_token(project_id));

CREATE POLICY "Anon select defect_pins" ON public.defect_pins FOR SELECT TO anon
  USING (public.has_valid_contractor_portal_token(project_id));
CREATE POLICY "Anon insert defect_pins" ON public.defect_pins FOR INSERT TO anon
  WITH CHECK (public.has_valid_contractor_portal_token(project_id));
CREATE POLICY "Anon update defect_pins" ON public.defect_pins FOR UPDATE TO anon
  USING (public.has_valid_contractor_portal_token(project_id));

CREATE POLICY "Anon select defect_photos" ON public.defect_photos FOR SELECT TO anon
  USING (EXISTS (SELECT 1 FROM public.defect_pins dp WHERE dp.id = pin_id AND public.has_valid_contractor_portal_token(dp.project_id)));
CREATE POLICY "Anon insert defect_photos" ON public.defect_photos FOR INSERT TO anon
  WITH CHECK (EXISTS (SELECT 1 FROM public.defect_pins dp WHERE dp.id = pin_id AND public.has_valid_contractor_portal_token(dp.project_id)));

CREATE POLICY "Anon select defect_activity" ON public.defect_activity FOR SELECT TO anon
  USING (EXISTS (SELECT 1 FROM public.defect_pins dp WHERE dp.id = pin_id AND public.has_valid_contractor_portal_token(dp.project_id)));
CREATE POLICY "Anon insert defect_activity" ON public.defect_activity FOR INSERT TO anon
  WITH CHECK (EXISTS (SELECT 1 FROM public.defect_pins dp WHERE dp.id = pin_id AND public.has_valid_contractor_portal_token(dp.project_id)));

-- Authenticated policies (internal team)
CREATE POLICY "Auth select defect_lists" ON public.defect_lists FOR SELECT TO authenticated
  USING (public.has_project_access(auth.uid(), project_id));
CREATE POLICY "Auth all defect_lists" ON public.defect_lists FOR ALL TO authenticated
  USING (public.has_project_access(auth.uid(), project_id));

CREATE POLICY "Auth select defect_pins" ON public.defect_pins FOR SELECT TO authenticated
  USING (public.has_project_access(auth.uid(), project_id));
CREATE POLICY "Auth all defect_pins" ON public.defect_pins FOR ALL TO authenticated
  USING (public.has_project_access(auth.uid(), project_id));

CREATE POLICY "Auth select defect_photos" ON public.defect_photos FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.defect_pins dp WHERE dp.id = pin_id AND public.has_project_access(auth.uid(), dp.project_id)));
CREATE POLICY "Auth all defect_photos" ON public.defect_photos FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.defect_pins dp WHERE dp.id = pin_id AND public.has_project_access(auth.uid(), dp.project_id)));

CREATE POLICY "Auth select defect_activity" ON public.defect_activity FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.defect_pins dp WHERE dp.id = pin_id AND public.has_project_access(auth.uid(), dp.project_id)));
CREATE POLICY "Auth all defect_activity" ON public.defect_activity FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.defect_pins dp WHERE dp.id = pin_id AND public.has_project_access(auth.uid(), dp.project_id)));

-- Storage bucket for defect photos
INSERT INTO storage.buckets (id, name, public) VALUES ('defect-photos', 'defect-photos', true);

-- Storage RLS: anyone can upload/read defect photos
CREATE POLICY "Public read defect photos" ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'defect-photos');
CREATE POLICY "Anon upload defect photos" ON storage.objects FOR INSERT TO anon
  WITH CHECK (bucket_id = 'defect-photos');
CREATE POLICY "Auth upload defect photos" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'defect-photos');
