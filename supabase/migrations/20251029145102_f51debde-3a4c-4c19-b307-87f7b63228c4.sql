-- Add moderator role to app_role enum if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE app_role AS ENUM ('admin', 'moderator', 'user');
  ELSE
    -- Check if moderator exists, if not add it
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'moderator' AND enumtypid = 'app_role'::regtype) THEN
      ALTER TYPE app_role ADD VALUE 'moderator';
    END IF;
  END IF;
END$$;