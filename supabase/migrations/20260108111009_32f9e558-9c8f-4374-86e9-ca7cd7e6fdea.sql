-- Add enhanced fields for comprehensive site diary entries
ALTER TABLE public.site_diary_entries 
  ADD COLUMN IF NOT EXISTS workforce_details jsonb DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS deliveries jsonb DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS safety_observations text,
  ADD COLUMN IF NOT EXISTS design_decisions jsonb DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS instructions_received jsonb DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS instructions_issued jsonb DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS visitors jsonb DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS plant_equipment jsonb DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS delays_disruptions text,
  ADD COLUMN IF NOT EXISTS quality_issues text,
  ADD COLUMN IF NOT EXISTS photos jsonb DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS linked_documents jsonb DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS entry_type text DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS shift_type text DEFAULT 'day';

-- Add comment for documentation
COMMENT ON COLUMN public.site_diary_entries.workforce_details IS 'JSON object containing workforce counts by trade';
COMMENT ON COLUMN public.site_diary_entries.design_decisions IS 'Array of design decisions made on site for project record';
COMMENT ON COLUMN public.site_diary_entries.instructions_received IS 'Architect/Engineer instructions received (RFIs, site instructions)';
COMMENT ON COLUMN public.site_diary_entries.instructions_issued IS 'Instructions issued to subcontractors';
COMMENT ON COLUMN public.site_diary_entries.entry_type IS 'Type: standard, handover, inspection, milestone';