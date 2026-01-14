
-- Drop the existing INSERT policy
DROP POLICY IF EXISTS "Users can create review sessions for their projects" ON public.roadmap_review_sessions;

-- Create updated INSERT policy that also allows admins
CREATE POLICY "Users can create review sessions for their projects" 
ON public.roadmap_review_sessions 
FOR INSERT 
WITH CHECK (
  (EXISTS (
    SELECT 1 FROM project_members pm
    WHERE pm.project_id = roadmap_review_sessions.project_id 
    AND pm.user_id = auth.uid()
  ))
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Also update SELECT policy to include admins
DROP POLICY IF EXISTS "Users can view review sessions for their projects" ON public.roadmap_review_sessions;

CREATE POLICY "Users can view review sessions for their projects" 
ON public.roadmap_review_sessions 
FOR SELECT 
USING (
  (EXISTS (
    SELECT 1 FROM project_members pm
    WHERE pm.project_id = roadmap_review_sessions.project_id 
    AND pm.user_id = auth.uid()
  ))
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Also update UPDATE policy to include admins  
DROP POLICY IF EXISTS "Users can update their own review sessions" ON public.roadmap_review_sessions;

CREATE POLICY "Users can update their own review sessions" 
ON public.roadmap_review_sessions 
FOR UPDATE 
USING (
  started_by = auth.uid() 
  OR has_role(auth.uid(), 'admin'::app_role)
);
