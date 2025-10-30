-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Backup job configurations and schedules
CREATE TABLE backup_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  backup_type TEXT NOT NULL CHECK (backup_type IN ('full', 'incremental', 'differential')),
  schedule_cron TEXT,
  enabled BOOLEAN DEFAULT true,
  retention_days INTEGER DEFAULT 30,
  storage_provider TEXT CHECK (storage_provider IN ('lovable_cloud', 'google_drive', 'onedrive', 'dropbox', 's3')),
  storage_config JSONB,
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Backup execution history
CREATE TABLE backup_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES backup_jobs(id) ON DELETE CASCADE,
  backup_type TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  file_size_bytes BIGINT,
  file_path TEXT,
  tables_included TEXT[],
  records_count JSONB,
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Backup file storage metadata
CREATE TABLE backup_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  backup_id UUID REFERENCES backup_history(id) ON DELETE CASCADE,
  file_type TEXT CHECK (file_type IN ('database', 'storage_bucket', 'combined')),
  bucket_name TEXT,
  file_path TEXT NOT NULL,
  file_size_bytes BIGINT,
  checksum TEXT,
  compression_type TEXT,
  encryption_enabled BOOLEAN DEFAULT false,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Recovery operations tracking
CREATE TABLE recovery_operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  backup_id UUID REFERENCES backup_history(id),
  recovery_type TEXT CHECK (recovery_type IN ('full', 'selective', 'point_in_time')),
  tables_to_restore TEXT[],
  target_timestamp TIMESTAMPTZ,
  status TEXT CHECK (status IN ('pending', 'running', 'completed', 'failed', 'rolled_back')),
  initiated_by UUID REFERENCES auth.users(id),
  initiated_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  records_restored JSONB,
  error_message TEXT,
  rollback_available BOOLEAN DEFAULT false
);

-- Backup health monitoring
CREATE TABLE backup_health_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  backup_id UUID REFERENCES backup_history(id),
  check_type TEXT CHECK (check_type IN ('integrity', 'accessibility', 'restore_test')),
  status TEXT CHECK (status IN ('pass', 'fail', 'warning')),
  details JSONB,
  checked_at TIMESTAMPTZ DEFAULT now()
);

-- Cloud storage provider credentials
CREATE TABLE storage_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_name TEXT NOT NULL,
  enabled BOOLEAN DEFAULT false,
  credentials JSONB,
  config JSONB,
  last_tested_at TIMESTAMPTZ,
  test_status TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE backup_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE backup_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE backup_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE recovery_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE backup_health_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage_providers ENABLE ROW LEVEL SECURITY;

-- Admin-only access policies
CREATE POLICY "Admin full access to backup_jobs" ON backup_jobs
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin full access to backup_history" ON backup_history
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin full access to backup_files" ON backup_files
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin full access to recovery_operations" ON recovery_operations
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin full access to backup_health_checks" ON backup_health_checks
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin full access to storage_providers" ON storage_providers
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Triggers for updated_at
CREATE TRIGGER update_backup_jobs_updated_at
  BEFORE UPDATE ON backup_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_storage_providers_updated_at
  BEFORE UPDATE ON storage_providers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create storage bucket for backups
INSERT INTO storage.buckets (id, name, public) 
VALUES ('backups', 'backups', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for backup bucket
CREATE POLICY "Admins can upload backups"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'backups' AND 
    has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Admins can read backups"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'backups' AND 
    has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Admins can delete backups"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'backups' AND 
    has_role(auth.uid(), 'admin'::app_role)
  );

-- Schedule daily full backup at 2 AM UTC
SELECT cron.schedule(
  'daily-full-backup',
  '0 2 * * *',
  $$
  SELECT net.http_post(
    url := 'https://rsdisaisxdglmdmzmkyw.supabase.co/functions/v1/backup-database',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJzZGlzYWlzeGRnbG1kbXpta3l3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA4ODUwODMsImV4cCI6MjA3NjQ2MTA4M30.5ITwzL2-pum7MzmpDZIti0Ze81csCElXLca2FnPKojM"}'::jsonb,
    body := '{"backup_type": "full", "job_id": "auto-daily-full"}'::jsonb
  ) as request_id;
  $$
);

-- Schedule incremental backup every 6 hours
SELECT cron.schedule(
  'incremental-backup-6h',
  '0 */6 * * *',
  $$
  SELECT net.http_post(
    url := 'https://rsdisaisxdglmdmzmkyw.supabase.co/functions/v1/backup-database',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJzZGlzYWlzeGRnbG1kbXpta3l3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA4ODUwODMsImV4cCI6MjA3NjQ2MTA4M30.5ITwzL2-pum7MzmpDZIti0Ze81csCElXLca2FnPKojM"}'::jsonb,
    body := '{"backup_type": "incremental", "job_id": "auto-incremental-6h"}'::jsonb
  ) as request_id;
  $$
);

-- Schedule backup cleanup monthly
SELECT cron.schedule(
  'monthly-backup-cleanup',
  '0 5 1 * *',
  $$
  DELETE FROM backup_history
  WHERE completed_at < now() - interval '30 days'
    AND status = 'completed';
  $$
);