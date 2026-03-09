
-- Add missing columns and rename to match spec
ALTER TABLE public.coc_validations 
  ADD COLUMN IF NOT EXISTS date_of_issue DATE,
  ADD COLUMN IF NOT EXISTS validation_results_json JSONB;

-- Copy data from old column if it exists
UPDATE public.coc_validations SET validation_results_json = validation_result WHERE validation_result IS NOT NULL;

-- Drop old columns that don't match spec naming
ALTER TABLE public.coc_validations 
  DROP COLUMN IF EXISTS passed_rules_count,
  DROP COLUMN IF EXISTS failed_rules_count,
  DROP COLUMN IF EXISTS validation_result;

-- Update RLS to use project membership
DROP POLICY IF EXISTS "Users can view own COC validations" ON public.coc_validations;
DROP POLICY IF EXISTS "Users can insert COC validations" ON public.coc_validations;
DROP POLICY IF EXISTS "Users can update own COC validations" ON public.coc_validations;

CREATE POLICY "Users can view project COC validations"
  ON public.coc_validations FOR SELECT
  TO authenticated
  USING (
    created_by = auth.uid() 
    OR (project_id IS NOT NULL AND public.has_project_access(auth.uid(), project_id))
  );

CREATE POLICY "Users can insert COC validations"
  ON public.coc_validations FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update own COC validations"
  ON public.coc_validations FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid());
