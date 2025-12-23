-- Add DELETE policy for final_account_section_comments
CREATE POLICY "Users can delete their own comments" 
ON public.final_account_section_comments 
FOR DELETE 
USING (
  -- Authenticated users can delete internal comments on accessible sections
  (author_type = 'internal' AND author_id = auth.uid() AND EXISTS (
    SELECT 1 FROM final_account_sections s
    JOIN final_account_bills b ON s.bill_id = b.id
    JOIN final_accounts fa ON b.final_account_id = fa.id
    WHERE s.id = final_account_section_comments.section_id 
    AND has_project_access(auth.uid(), fa.project_id)
  ))
  OR
  -- Contractors can delete contractor comments via valid review token
  (author_type = 'contractor' AND EXISTS (
    SELECT 1 FROM final_account_section_reviews r
    WHERE r.id = final_account_section_comments.review_id 
    AND r.access_token IS NOT NULL
  ))
);