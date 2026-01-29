-- Add template_id column to drawing_review_status table
ALTER TABLE public.drawing_review_status 
ADD COLUMN template_id uuid REFERENCES public.drawing_checklist_templates(id);

-- Add comment for documentation
COMMENT ON COLUMN public.drawing_review_status.template_id IS 'Reference to the checklist template used for this review';