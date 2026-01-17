-- Add engineer_position column to project_members table
-- Values can be: null (no position), 'primary' (Lead Project Engineer), 'secondary' (Secondary Engineer)
ALTER TABLE public.project_members 
ADD COLUMN engineer_position TEXT DEFAULT NULL;

-- Add a constraint to ensure only valid values
ALTER TABLE public.project_members
ADD CONSTRAINT valid_engineer_position 
CHECK (engineer_position IS NULL OR engineer_position IN ('primary', 'secondary'));

-- Create a function to ensure only one primary and one secondary engineer per project
CREATE OR REPLACE FUNCTION check_unique_engineer_position()
RETURNS TRIGGER AS $$
BEGIN
    -- If setting a position (not null), check if someone else already has it
    IF NEW.engineer_position IS NOT NULL THEN
        IF EXISTS (
            SELECT 1 FROM public.project_members 
            WHERE project_id = NEW.project_id 
            AND engineer_position = NEW.engineer_position
            AND id != NEW.id
        ) THEN
            RAISE EXCEPTION 'A % engineer is already assigned to this project', NEW.engineer_position;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to enforce unique engineer positions per project
CREATE TRIGGER enforce_unique_engineer_position
BEFORE INSERT OR UPDATE ON public.project_members
FOR EACH ROW
EXECUTE FUNCTION check_unique_engineer_position();