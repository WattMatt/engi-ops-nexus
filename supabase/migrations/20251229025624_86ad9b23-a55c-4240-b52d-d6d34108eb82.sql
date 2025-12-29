-- Add column to track original canvas ID for material linking
ALTER TABLE public.floor_plan_cables 
ADD COLUMN IF NOT EXISTS original_canvas_id TEXT;

-- Add comment for clarity
COMMENT ON COLUMN public.floor_plan_cables.original_canvas_id IS 'Original JavaScript canvas ID to link with db_circuit_materials.canvas_line_id';