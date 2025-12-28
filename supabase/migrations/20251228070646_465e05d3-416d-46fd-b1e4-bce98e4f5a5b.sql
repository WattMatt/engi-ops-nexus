-- Add canvas_line_id to link circuit materials to canvas lines for sync deletion
ALTER TABLE public.db_circuit_materials
ADD COLUMN IF NOT EXISTS canvas_line_id TEXT;

-- Create index for faster lookup when deleting
CREATE INDEX IF NOT EXISTS idx_circuit_materials_canvas_line ON public.db_circuit_materials(canvas_line_id);

COMMENT ON COLUMN public.db_circuit_materials.canvas_line_id IS 'Reference to the canvas line ID for sync deletion when line is removed';