-- Fix the FK constraint to allow history records to persist after variation deletion
-- by setting variation_id to NULL when the referenced variation is deleted

ALTER TABLE public.cost_variation_history 
DROP CONSTRAINT IF EXISTS cost_variation_history_variation_id_fkey;

ALTER TABLE public.cost_variation_history 
ADD CONSTRAINT cost_variation_history_variation_id_fkey 
FOREIGN KEY (variation_id) 
REFERENCES public.cost_variations(id) 
ON DELETE SET NULL;