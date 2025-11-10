-- Ensure all project creators are members of their projects
-- This fixes cases where the trigger might not have fired

INSERT INTO project_members (project_id, user_id, role)
SELECT 
  p.id as project_id,
  p.created_by as user_id,
  'owner' as role
FROM projects p
WHERE p.created_by IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 
    FROM project_members pm 
    WHERE pm.project_id = p.id 
    AND pm.user_id = p.created_by
  )
ON CONFLICT DO NOTHING;