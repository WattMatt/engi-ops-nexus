
-- 5. project_inspection_items: tighten from USING(true) to proper token check
DROP POLICY IF EXISTS "Anonymous users can view project inspection items" ON public.project_inspection_items;
CREATE POLICY "Anon can view project inspection items with valid token"
ON public.project_inspection_items FOR SELECT TO anon
USING (
  has_valid_client_portal_token(project_id) OR has_valid_contractor_portal_token(project_id)
);

-- 6. project_inspection_items UPDATE: tighten from USING(true) to proper token check
DROP POLICY IF EXISTS "Anonymous users can update inspection status" ON public.project_inspection_items;
CREATE POLICY "Anon can update inspection items with valid token"
ON public.project_inspection_items FOR UPDATE TO anon
USING (
  has_valid_contractor_portal_token(project_id)
);

-- 7. handover_folders: add anon read for portal document browsing
CREATE POLICY "Anon can view handover folders with valid portal token"
ON public.handover_folders FOR SELECT TO anon
USING (
  has_valid_client_portal_token(project_id) OR has_valid_contractor_portal_token(project_id)
);
