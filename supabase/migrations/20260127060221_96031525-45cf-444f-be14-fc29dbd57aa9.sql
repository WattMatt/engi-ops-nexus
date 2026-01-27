-- Per-user storage connections table for individual Dropbox/cloud storage accounts
CREATE TABLE public.user_storage_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  credentials JSONB,
  account_info JSONB,
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ,
  status TEXT DEFAULT 'connected',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, provider)
);

-- Enable RLS
ALTER TABLE public.user_storage_connections ENABLE ROW LEVEL SECURITY;

-- Users can only view their own connections
CREATE POLICY "Users can view own storage connections"
  ON public.user_storage_connections FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can insert their own connections
CREATE POLICY "Users can insert own storage connections"
  ON public.user_storage_connections FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can update their own connections
CREATE POLICY "Users can update own storage connections"
  ON public.user_storage_connections FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own connections
CREATE POLICY "Users can delete own storage connections"
  ON public.user_storage_connections FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Create trigger for updated_at
CREATE TRIGGER update_user_storage_connections_updated_at
  BEFORE UPDATE ON public.user_storage_connections
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();