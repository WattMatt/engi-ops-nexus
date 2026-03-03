
-- Mapping table to link Azure AD Object IDs to Nexus (Supabase) profile UUIDs
CREATE TABLE public.azure_ad_user_mapping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  azure_ad_object_id TEXT NOT NULL UNIQUE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  display_name TEXT,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast lookups during sync
CREATE INDEX idx_azure_ad_mapping_object_id ON public.azure_ad_user_mapping(azure_ad_object_id);
CREATE INDEX idx_azure_ad_mapping_profile_id ON public.azure_ad_user_mapping(profile_id);

-- RLS
ALTER TABLE public.azure_ad_user_mapping ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read mappings
CREATE POLICY "Authenticated users can read azure ad mappings"
  ON public.azure_ad_user_mapping FOR SELECT TO authenticated USING (true);

-- Allow admins to manage mappings
CREATE POLICY "Admins can manage azure ad mappings"
  ON public.azure_ad_user_mapping FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));
