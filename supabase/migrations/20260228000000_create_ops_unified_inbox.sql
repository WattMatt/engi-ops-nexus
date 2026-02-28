-- Create a neutral ground table for unified task ingestion
CREATE TABLE IF NOT EXISTS ops_unified_inbox (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    -- Core Task Data
    title TEXT NOT NULL,
    description TEXT,
    project_ref TEXT, -- "(XXX) Name" or raw project name
    
    -- State
    status TEXT DEFAULT 'inbox', -- inbox, processing, processed, error, archived
    priority TEXT DEFAULT 'medium', -- low, medium, high
    due_date TIMESTAMPTZ,
    assigned_to UUID REFERENCES auth.users(id), -- Optional: Link to Nexus user
    assigned_to_raw TEXT, -- "Arno", "Spud" (Text fallback)
    
    -- Origin
    source TEXT NOT NULL, -- reminders, planner, nexus, email
    
    -- Sync Links
    external_ids JSONB DEFAULT '{}'::jsonb, -- { "reminder_id": "...", "planner_id": "..." }
    raw_payload JSONB DEFAULT '{}'::jsonb -- The original hook payload
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ops_inbox_status ON ops_unified_inbox(status);
CREATE INDEX IF NOT EXISTS idx_ops_inbox_project_ref ON ops_unified_inbox(project_ref);
CREATE INDEX IF NOT EXISTS idx_ops_inbox_created_at ON ops_unified_inbox(created_at);

-- Add RLS Policies
ALTER TABLE ops_unified_inbox ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users (and service roles) full access for now
CREATE POLICY "Allow full access to authenticated users"
ON ops_unified_inbox
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_ops_inbox_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_ops_inbox_updated_at
    BEFORE UPDATE ON ops_unified_inbox
    FOR EACH ROW
    EXECUTE FUNCTION update_ops_inbox_updated_at();
