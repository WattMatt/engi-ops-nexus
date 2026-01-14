
-- Drop existing policies on roadmap_item_updates
DROP POLICY IF EXISTS "Users can create item updates for their sessions" ON public.roadmap_item_updates;
DROP POLICY IF EXISTS "Users can update their own item updates" ON public.roadmap_item_updates;
DROP POLICY IF EXISTS "Users can view item updates for sessions they can access" ON public.roadmap_item_updates;

-- Create updated INSERT policy that also allows admins
CREATE POLICY "Users can create item updates for their sessions" 
ON public.roadmap_item_updates 
FOR INSERT 
WITH CHECK (
  (EXISTS (
    SELECT 1 FROM roadmap_review_sessions rrs
    WHERE rrs.id = roadmap_item_updates.review_session_id 
    AND rrs.started_by = auth.uid()
  ))
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Create updated SELECT policy that also allows admins
CREATE POLICY "Users can view item updates for sessions they can access" 
ON public.roadmap_item_updates 
FOR SELECT 
USING (
  (EXISTS (
    SELECT 1 FROM roadmap_review_sessions rrs
    JOIN project_members pm ON pm.project_id = rrs.project_id
    WHERE rrs.id = roadmap_item_updates.review_session_id 
    AND pm.user_id = auth.uid()
  ))
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Create updated UPDATE policy that also allows admins
CREATE POLICY "Users can update their own item updates" 
ON public.roadmap_item_updates 
FOR UPDATE 
USING (
  (EXISTS (
    SELECT 1 FROM roadmap_review_sessions rrs
    WHERE rrs.id = roadmap_item_updates.review_session_id 
    AND rrs.started_by = auth.uid()
  ))
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Add DELETE policy for completeness
CREATE POLICY "Users can delete their own item updates" 
ON public.roadmap_item_updates 
FOR DELETE 
USING (
  (EXISTS (
    SELECT 1 FROM roadmap_review_sessions rrs
    WHERE rrs.id = roadmap_item_updates.review_session_id 
    AND rrs.started_by = auth.uid()
  ))
  OR has_role(auth.uid(), 'admin'::app_role)
);
