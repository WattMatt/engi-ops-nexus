-- Phase 1: Add short_code column to contractor_portal_tokens
ALTER TABLE contractor_portal_tokens ADD COLUMN IF NOT EXISTS short_code TEXT UNIQUE;

-- Create trigger function to auto-generate short codes on insert
CREATE OR REPLACE FUNCTION generate_short_token_code()
RETURNS TRIGGER AS $$
BEGIN
  -- Generate 8-character uppercase alphanumeric code from token hash
  NEW.short_code := UPPER(SUBSTRING(MD5(NEW.token || gen_random_uuid()::text) FROM 1 FOR 8));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger (drop first if exists)
DROP TRIGGER IF EXISTS set_short_code_trigger ON contractor_portal_tokens;
CREATE TRIGGER set_short_code_trigger
  BEFORE INSERT ON contractor_portal_tokens
  FOR EACH ROW
  WHEN (NEW.short_code IS NULL)
  EXECUTE FUNCTION generate_short_token_code();

-- Generate short codes for existing tokens that don't have one
UPDATE contractor_portal_tokens 
SET short_code = UPPER(SUBSTRING(MD5(token || id::text) FROM 1 FOR 8))
WHERE short_code IS NULL;

-- Add RPC function to lookup by short code
CREATE OR REPLACE FUNCTION validate_portal_short_code(p_code TEXT)
RETURNS TABLE (
  token TEXT,
  project_id UUID,
  contractor_type TEXT,
  contractor_name TEXT,
  contractor_email TEXT,
  company_name TEXT,
  is_valid BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.token,
    t.project_id,
    t.contractor_type,
    t.contractor_name,
    t.contractor_email,
    t.company_name,
    (t.is_active AND t.expires_at > NOW()) AS is_valid
  FROM contractor_portal_tokens t
  WHERE t.short_code = UPPER(p_code);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Phase 2: Create token notification contacts table
CREATE TABLE IF NOT EXISTS token_notification_contacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  token_id UUID REFERENCES contractor_portal_tokens(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT,
  receives_rfi_notifications BOOLEAN DEFAULT true,
  receives_status_updates BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(token_id, email)
);

-- Enable RLS
ALTER TABLE token_notification_contacts ENABLE ROW LEVEL SECURITY;

-- Create policy for project members to manage notification contacts
CREATE POLICY "Project members can view notification contacts"
ON token_notification_contacts FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM contractor_portal_tokens t
    JOIN project_members pm ON pm.project_id = t.project_id
    WHERE t.id = token_notification_contacts.token_id
    AND pm.user_id = auth.uid()
  )
);

CREATE POLICY "Project members can insert notification contacts"
ON token_notification_contacts FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM contractor_portal_tokens t
    JOIN project_members pm ON pm.project_id = t.project_id
    WHERE t.id = token_notification_contacts.token_id
    AND pm.user_id = auth.uid()
  )
);

CREATE POLICY "Project members can update notification contacts"
ON token_notification_contacts FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM contractor_portal_tokens t
    JOIN project_members pm ON pm.project_id = t.project_id
    WHERE t.id = token_notification_contacts.token_id
    AND pm.user_id = auth.uid()
  )
);

CREATE POLICY "Project members can delete notification contacts"
ON token_notification_contacts FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM contractor_portal_tokens t
    JOIN project_members pm ON pm.project_id = t.project_id
    WHERE t.id = token_notification_contacts.token_id
    AND pm.user_id = auth.uid()
  )
);