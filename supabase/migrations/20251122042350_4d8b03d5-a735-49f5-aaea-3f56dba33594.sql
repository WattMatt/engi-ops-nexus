-- Create tenant notification settings table
CREATE TABLE IF NOT EXISTS tenant_notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Notification thresholds (days)
  bo_critical_days INTEGER DEFAULT 7,
  bo_warning_days INTEGER DEFAULT 14,
  bo_info_days INTEGER DEFAULT 30,
  cost_entry_warning_days INTEGER DEFAULT 7,
  cost_entry_critical_days INTEGER DEFAULT 14,
  inactive_tenant_days INTEGER DEFAULT 30,
  
  -- Notification preferences
  notifications_enabled BOOLEAN DEFAULT true,
  email_notifications_enabled BOOLEAN DEFAULT true,
  email_frequency TEXT DEFAULT 'immediate' CHECK (email_frequency IN ('immediate', 'daily', 'weekly')),
  notification_email TEXT,
  
  -- Cooldown to prevent spam (hours)
  notification_cooldown_hours INTEGER DEFAULT 24,
  
  UNIQUE(project_id)
);

-- Enable RLS
ALTER TABLE tenant_notification_settings ENABLE ROW LEVEL SECURITY;

-- Project members can view their project's settings
CREATE POLICY "Project members can view notification settings"
ON tenant_notification_settings
FOR SELECT
USING (is_project_member(auth.uid(), project_id));

-- Project members can insert settings for their projects
CREATE POLICY "Project members can insert notification settings"
ON tenant_notification_settings
FOR INSERT
WITH CHECK (is_project_member(auth.uid(), project_id));

-- Project members can update their project's settings
CREATE POLICY "Project members can update notification settings"
ON tenant_notification_settings
FOR UPDATE
USING (is_project_member(auth.uid(), project_id));

-- Add order tracking fields to tenants table
ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS db_order_date DATE,
ADD COLUMN IF NOT EXISTS lighting_order_date DATE,
ADD COLUMN IF NOT EXISTS last_notification_sent TIMESTAMPTZ;

-- Create index for notification queries
CREATE INDEX IF NOT EXISTS idx_tenants_notification_check 
ON tenants(project_id, opening_date, last_notification_sent) 
WHERE opening_date IS NOT NULL;

-- Add trigger to update updated_at
CREATE TRIGGER update_tenant_notification_settings_updated_at
  BEFORE UPDATE ON tenant_notification_settings
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();