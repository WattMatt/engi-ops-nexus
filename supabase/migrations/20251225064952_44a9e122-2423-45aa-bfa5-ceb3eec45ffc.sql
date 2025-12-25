-- Distribution Boards table
CREATE TABLE public.distribution_boards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  floor_plan_id UUID REFERENCES public.floor_plan_projects(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  location TEXT,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Circuits under Distribution Boards
CREATE TABLE public.db_circuits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  distribution_board_id UUID NOT NULL REFERENCES public.distribution_boards(id) ON DELETE CASCADE,
  circuit_ref TEXT NOT NULL,
  circuit_type TEXT,
  description TEXT,
  breaker_size TEXT,
  cable_size TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Circuit Material Items (materials assigned to each circuit)
CREATE TABLE public.db_circuit_materials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  circuit_id UUID NOT NULL REFERENCES public.db_circuits(id) ON DELETE CASCADE,
  master_material_id UUID REFERENCES public.master_materials(id) ON DELETE SET NULL,
  boq_item_code TEXT,
  description TEXT NOT NULL,
  unit TEXT,
  quantity NUMERIC DEFAULT 0,
  supply_rate NUMERIC DEFAULT 0,
  install_rate NUMERIC DEFAULT 0,
  total_cost NUMERIC GENERATED ALWAYS AS (quantity * (supply_rate + install_rate)) STORED,
  final_account_item_id UUID REFERENCES public.final_account_items(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.distribution_boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.db_circuits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.db_circuit_materials ENABLE ROW LEVEL SECURITY;

-- RLS Policies for distribution_boards (using created_by from projects)
CREATE POLICY "Users can view distribution boards for their projects"
ON public.distribution_boards FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = distribution_boards.project_id
    AND p.created_by = auth.uid()
  )
);

CREATE POLICY "Users can create distribution boards for their projects"
ON public.distribution_boards FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = distribution_boards.project_id
    AND p.created_by = auth.uid()
  )
);

CREATE POLICY "Users can update distribution boards for their projects"
ON public.distribution_boards FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = distribution_boards.project_id
    AND p.created_by = auth.uid()
  )
);

CREATE POLICY "Users can delete distribution boards for their projects"
ON public.distribution_boards FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = distribution_boards.project_id
    AND p.created_by = auth.uid()
  )
);

-- RLS Policies for db_circuits
CREATE POLICY "Users can view circuits for their DBs"
ON public.db_circuits FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.distribution_boards db
    JOIN public.projects p ON p.id = db.project_id
    WHERE db.id = db_circuits.distribution_board_id
    AND p.created_by = auth.uid()
  )
);

CREATE POLICY "Users can create circuits for their DBs"
ON public.db_circuits FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.distribution_boards db
    JOIN public.projects p ON p.id = db.project_id
    WHERE db.id = db_circuits.distribution_board_id
    AND p.created_by = auth.uid()
  )
);

CREATE POLICY "Users can update circuits for their DBs"
ON public.db_circuits FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.distribution_boards db
    JOIN public.projects p ON p.id = db.project_id
    WHERE db.id = db_circuits.distribution_board_id
    AND p.created_by = auth.uid()
  )
);

CREATE POLICY "Users can delete circuits for their DBs"
ON public.db_circuits FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.distribution_boards db
    JOIN public.projects p ON p.id = db.project_id
    WHERE db.id = db_circuits.distribution_board_id
    AND p.created_by = auth.uid()
  )
);

-- RLS Policies for db_circuit_materials
CREATE POLICY "Users can view circuit materials"
ON public.db_circuit_materials FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.db_circuits c
    JOIN public.distribution_boards db ON db.id = c.distribution_board_id
    JOIN public.projects p ON p.id = db.project_id
    WHERE c.id = db_circuit_materials.circuit_id
    AND p.created_by = auth.uid()
  )
);

CREATE POLICY "Users can create circuit materials"
ON public.db_circuit_materials FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.db_circuits c
    JOIN public.distribution_boards db ON db.id = c.distribution_board_id
    JOIN public.projects p ON p.id = db.project_id
    WHERE c.id = db_circuit_materials.circuit_id
    AND p.created_by = auth.uid()
  )
);

CREATE POLICY "Users can update circuit materials"
ON public.db_circuit_materials FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.db_circuits c
    JOIN public.distribution_boards db ON db.id = c.distribution_board_id
    JOIN public.projects p ON p.id = db.project_id
    WHERE c.id = db_circuit_materials.circuit_id
    AND p.created_by = auth.uid()
  )
);

CREATE POLICY "Users can delete circuit materials"
ON public.db_circuit_materials FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.db_circuits c
    JOIN public.distribution_boards db ON db.id = c.distribution_board_id
    JOIN public.projects p ON p.id = db.project_id
    WHERE c.id = db_circuit_materials.circuit_id
    AND p.created_by = auth.uid()
  )
);

-- Triggers for updated_at
CREATE TRIGGER update_distribution_boards_updated_at
BEFORE UPDATE ON public.distribution_boards
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_db_circuits_updated_at
BEFORE UPDATE ON public.db_circuits
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_db_circuit_materials_updated_at
BEFORE UPDATE ON public.db_circuit_materials
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes for performance
CREATE INDEX idx_distribution_boards_project ON public.distribution_boards(project_id);
CREATE INDEX idx_distribution_boards_floor_plan ON public.distribution_boards(floor_plan_id);
CREATE INDEX idx_db_circuits_board ON public.db_circuits(distribution_board_id);
CREATE INDEX idx_db_circuit_materials_circuit ON public.db_circuit_materials(circuit_id);
CREATE INDEX idx_db_circuit_materials_final_account ON public.db_circuit_materials(final_account_item_id);