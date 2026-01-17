-- Add position column 
ALTER TABLE public.project_members ADD COLUMN position TEXT DEFAULT 'admin';

-- Add constraint for valid position values
ALTER TABLE public.project_members ADD CONSTRAINT valid_position 
  CHECK (position IN ('primary', 'secondary', 'admin', 'oversight'));

-- Create function to ensure unique primary and secondary per project
CREATE OR REPLACE FUNCTION check_unique_position()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.position IN ('primary', 'secondary') THEN
    IF EXISTS (
      SELECT 1 FROM public.project_members 
      WHERE project_id = NEW.project_id 
      AND position = NEW.position 
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000')
    ) THEN
      RAISE EXCEPTION 'A % position is already assigned to this project', NEW.position;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to enforce unique primary/secondary per project
DROP TRIGGER IF EXISTS enforce_unique_position ON public.project_members;
CREATE TRIGGER enforce_unique_position
BEFORE INSERT OR UPDATE ON public.project_members
FOR EACH ROW
EXECUTE FUNCTION check_unique_position();

-- Recreate policies using new position column (admin can manage members)
CREATE POLICY "Project admins can manage members" ON public.project_members
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.project_members pm
    WHERE pm.project_id = project_members.project_id
    AND pm.user_id = auth.uid()
    AND pm.position = 'admin'
  )
);

CREATE POLICY "Project admins can update members" ON public.project_members
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.project_members pm
    WHERE pm.project_id = project_members.project_id
    AND pm.user_id = auth.uid()
    AND pm.position = 'admin'
  )
);

CREATE POLICY "Project admins can delete members" ON public.project_members
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.project_members pm
    WHERE pm.project_id = project_members.project_id
    AND pm.user_id = auth.uid()
    AND pm.position = 'admin'
  )
);