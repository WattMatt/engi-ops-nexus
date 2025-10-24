-- Create cable schedules table
CREATE TABLE public.cable_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL,
  schedule_name TEXT NOT NULL,
  schedule_number TEXT NOT NULL,
  revision TEXT NOT NULL DEFAULT 'Rev 0',
  schedule_date DATE NOT NULL,
  layout_name TEXT,
  notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create cable entries table
CREATE TABLE public.cable_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  schedule_id UUID NOT NULL,
  cable_tag TEXT NOT NULL,
  from_location TEXT NOT NULL,
  to_location TEXT NOT NULL,
  voltage NUMERIC,
  load_amps NUMERIC,
  cable_type TEXT,
  ohm_per_km NUMERIC,
  cable_number INTEGER,
  extra_length NUMERIC DEFAULT 0,
  measured_length NUMERIC DEFAULT 0,
  total_length NUMERIC DEFAULT 0,
  volt_drop NUMERIC,
  notes TEXT,
  cable_size TEXT,
  supply_cost NUMERIC DEFAULT 0,
  install_cost NUMERIC DEFAULT 0,
  total_cost NUMERIC DEFAULT 0,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.cable_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cable_entries ENABLE ROW LEVEL SECURITY;

-- RLS policies for cable_schedules
CREATE POLICY "Users can view cable schedules for their projects"
  ON public.cable_schedules FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = cable_schedules.project_id
        AND project_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create cable schedules for their projects"
  ON public.cable_schedules FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = cable_schedules.project_id
        AND project_members.user_id = auth.uid()
    )
    AND created_by = auth.uid()
  );

CREATE POLICY "Users can update cable schedules for their projects"
  ON public.cable_schedules FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = cable_schedules.project_id
        AND project_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete cable schedules for their projects"
  ON public.cable_schedules FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = cable_schedules.project_id
        AND project_members.user_id = auth.uid()
    )
  );

-- RLS policies for cable_entries
CREATE POLICY "Users can view cable entries in their schedules"
  ON public.cable_entries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM cable_schedules cs
      JOIN project_members pm ON pm.project_id = cs.project_id
      WHERE cs.id = cable_entries.schedule_id
        AND pm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert cable entries in their schedules"
  ON public.cable_entries FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM cable_schedules cs
      JOIN project_members pm ON pm.project_id = cs.project_id
      WHERE cs.id = cable_entries.schedule_id
        AND pm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update cable entries in their schedules"
  ON public.cable_entries FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM cable_schedules cs
      JOIN project_members pm ON pm.project_id = cs.project_id
      WHERE cs.id = cable_entries.schedule_id
        AND pm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete cable entries in their schedules"
  ON public.cable_entries FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM cable_schedules cs
      JOIN project_members pm ON pm.project_id = cs.project_id
      WHERE cs.id = cable_entries.schedule_id
        AND pm.user_id = auth.uid()
    )
  );

-- Create triggers for updated_at
CREATE TRIGGER update_cable_schedules_updated_at
  BEFORE UPDATE ON public.cable_schedules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cable_entries_updated_at
  BEFORE UPDATE ON public.cable_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();