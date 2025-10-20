-- Add project_number column to projects table (nullable first)
ALTER TABLE public.projects 
ADD COLUMN project_number TEXT;

-- Update existing projects with auto-generated project numbers using a CTE
WITH numbered_projects AS (
  SELECT id, 'PROJ-' || LPAD(ROW_NUMBER() OVER (ORDER BY created_at)::TEXT, 4, '0') as new_number
  FROM public.projects
  WHERE project_number IS NULL
)
UPDATE public.projects p
SET project_number = np.new_number
FROM numbered_projects np
WHERE p.id = np.id;

-- Now make it NOT NULL and UNIQUE
ALTER TABLE public.projects 
ALTER COLUMN project_number SET NOT NULL;

ALTER TABLE public.projects 
ADD CONSTRAINT projects_project_number_unique UNIQUE (project_number);

-- Add index for better sorting performance
CREATE INDEX idx_projects_project_number ON public.projects(project_number);