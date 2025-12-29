-- Drop existing policies
DROP POLICY IF EXISTS "Users can create circuit materials" ON public.db_circuit_materials;
DROP POLICY IF EXISTS "Users can view circuit materials" ON public.db_circuit_materials;
DROP POLICY IF EXISTS "Users can update circuit materials" ON public.db_circuit_materials;
DROP POLICY IF EXISTS "Users can delete circuit materials" ON public.db_circuit_materials;

-- Create new policies that handle both circuit-assigned and unassigned materials
CREATE POLICY "Users can view circuit materials" ON public.db_circuit_materials
FOR SELECT USING (
  -- Access via circuit -> board -> project
  EXISTS (
    SELECT 1 FROM db_circuits c
    JOIN distribution_boards db ON db.id = c.distribution_board_id
    JOIN projects p ON p.id = db.project_id
    WHERE c.id = db_circuit_materials.circuit_id AND p.created_by = auth.uid()
  )
  OR
  -- Access via direct project_id for unassigned materials
  (circuit_id IS NULL AND EXISTS (
    SELECT 1 FROM projects p WHERE p.id = db_circuit_materials.project_id AND p.created_by = auth.uid()
  ))
);

CREATE POLICY "Users can create circuit materials" ON public.db_circuit_materials
FOR INSERT WITH CHECK (
  -- Insert via circuit -> board -> project
  EXISTS (
    SELECT 1 FROM db_circuits c
    JOIN distribution_boards db ON db.id = c.distribution_board_id
    JOIN projects p ON p.id = db.project_id
    WHERE c.id = db_circuit_materials.circuit_id AND p.created_by = auth.uid()
  )
  OR
  -- Insert unassigned materials via direct project_id
  (circuit_id IS NULL AND EXISTS (
    SELECT 1 FROM projects p WHERE p.id = db_circuit_materials.project_id AND p.created_by = auth.uid()
  ))
);

CREATE POLICY "Users can update circuit materials" ON public.db_circuit_materials
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM db_circuits c
    JOIN distribution_boards db ON db.id = c.distribution_board_id
    JOIN projects p ON p.id = db.project_id
    WHERE c.id = db_circuit_materials.circuit_id AND p.created_by = auth.uid()
  )
  OR
  (circuit_id IS NULL AND EXISTS (
    SELECT 1 FROM projects p WHERE p.id = db_circuit_materials.project_id AND p.created_by = auth.uid()
  ))
);

CREATE POLICY "Users can delete circuit materials" ON public.db_circuit_materials
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM db_circuits c
    JOIN distribution_boards db ON db.id = c.distribution_board_id
    JOIN projects p ON p.id = db.project_id
    WHERE c.id = db_circuit_materials.circuit_id AND p.created_by = auth.uid()
  )
  OR
  (circuit_id IS NULL AND EXISTS (
    SELECT 1 FROM projects p WHERE p.id = db_circuit_materials.project_id AND p.created_by = auth.uid()
  ))
);