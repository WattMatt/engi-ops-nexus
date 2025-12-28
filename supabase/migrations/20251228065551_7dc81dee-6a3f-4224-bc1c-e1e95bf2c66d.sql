-- Add electrical material categorization and tracking fields to db_circuit_materials
ALTER TABLE public.db_circuit_materials
ADD COLUMN IF NOT EXISTS material_category TEXT DEFAULT 'cable',
ADD COLUMN IF NOT EXISTS boq_section TEXT,
ADD COLUMN IF NOT EXISTS installation_status TEXT DEFAULT 'planned',
ADD COLUMN IF NOT EXISTS wastage_factor NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS wastage_quantity NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS gross_quantity NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_auto_generated BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS parent_material_id UUID REFERENCES public.db_circuit_materials(id) ON DELETE CASCADE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_circuit_materials_category ON public.db_circuit_materials(material_category);
CREATE INDEX IF NOT EXISTS idx_circuit_materials_status ON public.db_circuit_materials(installation_status);
CREATE INDEX IF NOT EXISTS idx_circuit_materials_parent ON public.db_circuit_materials(parent_material_id);

-- Add comments for clarity
COMMENT ON COLUMN public.db_circuit_materials.material_category IS 'Category: cable, containment, termination, accessory, fitting, distribution';
COMMENT ON COLUMN public.db_circuit_materials.boq_section IS 'Standard BOQ section: CABLES, CONDUITS, DISTRIBUTION, FITTINGS, ACCESSORIES';
COMMENT ON COLUMN public.db_circuit_materials.installation_status IS 'Status: planned, installed, verified, invoiced';
COMMENT ON COLUMN public.db_circuit_materials.wastage_factor IS 'Wastage percentage (e.g., 0.10 for 10%)';
COMMENT ON COLUMN public.db_circuit_materials.wastage_quantity IS 'Calculated wastage quantity';
COMMENT ON COLUMN public.db_circuit_materials.gross_quantity IS 'Net quantity + wastage quantity';
COMMENT ON COLUMN public.db_circuit_materials.is_auto_generated IS 'True if material was auto-added (e.g., glands for cables)';
COMMENT ON COLUMN public.db_circuit_materials.parent_material_id IS 'Reference to parent material (for accessories linked to cables)';