
-- Create db_legend_cards table
CREATE TABLE public.db_legend_cards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id),
  project_id UUID NOT NULL REFERENCES public.projects(id),
  db_name TEXT NOT NULL DEFAULT 'DB-1',
  address TEXT,
  phone TEXT,
  email TEXT,
  tel_number TEXT,
  dol_reg_no TEXT,
  coc_no TEXT,
  addendum_no TEXT,
  card_date DATE,
  section_name TEXT,
  fed_from TEXT,
  feeding_breaker_id TEXT,
  feeding_system_info TEXT,
  circuits JSONB NOT NULL DEFAULT '[]'::jsonb,
  contactors JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft',
  submitted_at TIMESTAMPTZ,
  submitted_by_name TEXT,
  submitted_by_email TEXT,
  submitted_to_contact_id UUID REFERENCES public.project_contacts(id),
  reviewer_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS (public access for token-based portal)
ALTER TABLE public.db_legend_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access for db_legend_cards"
  ON public.db_legend_cards FOR SELECT USING (true);

CREATE POLICY "Public insert access for db_legend_cards"
  ON public.db_legend_cards FOR INSERT WITH CHECK (true);

CREATE POLICY "Public update access for db_legend_cards"
  ON public.db_legend_cards FOR UPDATE USING (true);

CREATE POLICY "Public delete access for db_legend_cards"
  ON public.db_legend_cards FOR DELETE USING (true);

-- Updated_at trigger
CREATE TRIGGER update_db_legend_cards_updated_at
  BEFORE UPDATE ON public.db_legend_cards
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.db_legend_cards;
