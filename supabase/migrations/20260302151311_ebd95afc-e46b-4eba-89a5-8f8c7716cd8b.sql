
CREATE TABLE public.ops_unified_inbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  status text DEFAULT 'inbox',
  source text NOT NULL,
  external_ref_id text,
  project_ref text,
  description text,
  priority text DEFAULT 'medium',
  due_date timestamptz,
  external_ids jsonb DEFAULT '{}'::jsonb,
  raw_payload jsonb DEFAULT '{}'::jsonb,
  assignee_ids jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (source, external_ref_id)
);

ALTER TABLE public.ops_unified_inbox ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon select on ops_unified_inbox"
  ON public.ops_unified_inbox FOR SELECT TO anon USING (true);

CREATE POLICY "Allow anon insert on ops_unified_inbox"
  ON public.ops_unified_inbox FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow anon update on ops_unified_inbox"
  ON public.ops_unified_inbox FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated full access on ops_unified_inbox"
  ON public.ops_unified_inbox FOR ALL TO authenticated USING (true) WITH CHECK (true);

NOTIFY pgrst, 'reload config';
