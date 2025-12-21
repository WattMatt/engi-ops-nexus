-- Drop and recreate the review_status check constraint to include 'flagged'
ALTER TABLE public.boq_extracted_items 
DROP CONSTRAINT boq_extracted_items_review_status_check;

ALTER TABLE public.boq_extracted_items 
ADD CONSTRAINT boq_extracted_items_review_status_check 
CHECK (review_status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'modified'::text, 'flagged'::text]));