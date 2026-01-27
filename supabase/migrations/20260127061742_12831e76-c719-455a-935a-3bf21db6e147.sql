-- Dropbox activity logs for audit and compliance
CREATE TABLE public.dropbox_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL, -- 'upload', 'download', 'delete', 'create_folder', 'list_folder'
  file_path TEXT NOT NULL,
  file_name TEXT,
  file_size BIGINT,
  file_type TEXT,
  status TEXT NOT NULL DEFAULT 'success', -- 'success', 'failed'
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX idx_dropbox_activity_user_id ON public.dropbox_activity_logs(user_id);
CREATE INDEX idx_dropbox_activity_action ON public.dropbox_activity_logs(action);
CREATE INDEX idx_dropbox_activity_created_at ON public.dropbox_activity_logs(created_at DESC);
CREATE INDEX idx_dropbox_activity_file_path ON public.dropbox_activity_logs(file_path);

-- Enable RLS
ALTER TABLE public.dropbox_activity_logs ENABLE ROW LEVEL SECURITY;

-- Users can view their own activity logs
CREATE POLICY "Users can view own activity logs"
  ON public.dropbox_activity_logs
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Only system (service role) can insert logs - done via edge function
CREATE POLICY "Service role can insert activity logs"
  ON public.dropbox_activity_logs
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Admins can view all activity logs (using has_role function if exists)
CREATE POLICY "Admins can view all activity logs"
  ON public.dropbox_activity_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );