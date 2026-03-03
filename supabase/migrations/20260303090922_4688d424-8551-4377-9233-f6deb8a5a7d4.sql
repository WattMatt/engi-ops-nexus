
-- Simple key-value store for system-level settings (e.g. persisted tokens)
CREATE TABLE public.system_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Only service_role should access this (no RLS policies = denied by default with RLS on)
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- No public policies — only service_role can read/write
COMMENT ON TABLE public.system_settings IS 'Internal system settings, accessible only via service_role';

-- Add planner-sync to config
-- (handled in config.toml file)
