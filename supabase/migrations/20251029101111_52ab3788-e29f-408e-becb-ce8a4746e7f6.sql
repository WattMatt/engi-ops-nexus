-- Update the floor_plan_projects design_purpose check constraint to include all design purposes
ALTER TABLE public.floor_plan_projects 
DROP CONSTRAINT IF EXISTS floor_plan_projects_design_purpose_check;

ALTER TABLE public.floor_plan_projects 
ADD CONSTRAINT floor_plan_projects_design_purpose_check 
CHECK (design_purpose = ANY (ARRAY[
  'Budget mark up',
  'Line shop measurements',
  'PV design',
  'Prelim design mark up',
  'Cable Schedule Markup',
  'Final Account Markup'
]));