-- Drop the existing unique constraint that only allows one mapping per equipment
ALTER TABLE public.floor_plan_material_mappings 
DROP CONSTRAINT IF EXISTS floor_plan_material_mappings_project_id_equipment_type_equi_key;

-- Create a new unique constraint that allows multiple BOQ items per equipment
-- but prevents the same BOQ item from being mapped twice to the same equipment
ALTER TABLE public.floor_plan_material_mappings
ADD CONSTRAINT floor_plan_material_mappings_unique_item_per_equipment 
UNIQUE (project_id, floor_plan_id, equipment_type, equipment_label, final_account_item_id, master_material_id);