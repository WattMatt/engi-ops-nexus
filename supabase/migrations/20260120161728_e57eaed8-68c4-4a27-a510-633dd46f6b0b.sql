-- Load Profiles table for storing meter-shop linkages and load data
CREATE TABLE public.load_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  document_id UUID REFERENCES public.bulk_services_documents(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  profile_type TEXT DEFAULT 'standard', -- standard, industrial, commercial, mixed
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  is_synced_to_external BOOLEAN DEFAULT false,
  external_profile_id TEXT, -- ID from wm-solar app
  last_sync_at TIMESTAMP WITH TIME ZONE,
  sync_status TEXT DEFAULT 'pending' -- pending, synced, error
);

-- Meter-Shop Linkages table
CREATE TABLE public.meter_shop_linkages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES public.load_profiles(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  meter_id TEXT NOT NULL,
  meter_name TEXT,
  meter_type TEXT, -- main, sub, check
  shop_number TEXT,
  shop_name TEXT,
  shop_category TEXT,
  connected_load_kva NUMERIC DEFAULT 0,
  max_demand_kva NUMERIC DEFAULT 0,
  power_factor NUMERIC DEFAULT 0.9,
  diversity_factor NUMERIC DEFAULT 0.8,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN DEFAULT true,
  external_linkage_id TEXT -- ID from wm-solar
);

-- Load Profile Readings for historical data
CREATE TABLE public.load_profile_readings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES public.load_profiles(id) ON DELETE CASCADE,
  linkage_id UUID REFERENCES public.meter_shop_linkages(id) ON DELETE CASCADE,
  reading_date DATE NOT NULL,
  reading_hour INTEGER CHECK (reading_hour >= 0 AND reading_hour <= 23),
  demand_kva NUMERIC DEFAULT 0,
  power_factor NUMERIC,
  energy_kwh NUMERIC DEFAULT 0,
  peak_demand_kva NUMERIC,
  reading_source TEXT DEFAULT 'manual', -- manual, import, sync
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Category Load Summary for charts
CREATE TABLE public.load_category_summary (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES public.load_profiles(id) ON DELETE CASCADE,
  category_name TEXT NOT NULL,
  category_code TEXT,
  total_area_sqm NUMERIC DEFAULT 0,
  total_connected_load_kva NUMERIC DEFAULT 0,
  max_demand_kva NUMERIC DEFAULT 0,
  va_per_sqm NUMERIC DEFAULT 0,
  shop_count INTEGER DEFAULT 0,
  diversity_factor NUMERIC DEFAULT 0.8,
  color_code TEXT, -- for charts
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.load_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meter_shop_linkages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.load_profile_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.load_category_summary ENABLE ROW LEVEL SECURITY;

-- RLS Policies for load_profiles
CREATE POLICY "Users can view load profiles for their projects"
  ON public.load_profiles FOR SELECT
  USING (public.has_project_access(auth.uid(), project_id) OR public.is_admin(auth.uid()));

CREATE POLICY "Users can create load profiles for their projects"
  ON public.load_profiles FOR INSERT
  WITH CHECK (public.has_project_access(auth.uid(), project_id) OR public.is_admin(auth.uid()));

CREATE POLICY "Users can update load profiles for their projects"
  ON public.load_profiles FOR UPDATE
  USING (public.has_project_access(auth.uid(), project_id) OR public.is_admin(auth.uid()));

CREATE POLICY "Users can delete load profiles for their projects"
  ON public.load_profiles FOR DELETE
  USING (public.has_project_access(auth.uid(), project_id) OR public.is_admin(auth.uid()));

-- RLS Policies for meter_shop_linkages
CREATE POLICY "Users can view meter linkages for their projects"
  ON public.meter_shop_linkages FOR SELECT
  USING (public.has_project_access(auth.uid(), project_id) OR public.is_admin(auth.uid()));

CREATE POLICY "Users can create meter linkages for their projects"
  ON public.meter_shop_linkages FOR INSERT
  WITH CHECK (public.has_project_access(auth.uid(), project_id) OR public.is_admin(auth.uid()));

CREATE POLICY "Users can update meter linkages for their projects"
  ON public.meter_shop_linkages FOR UPDATE
  USING (public.has_project_access(auth.uid(), project_id) OR public.is_admin(auth.uid()));

CREATE POLICY "Users can delete meter linkages for their projects"
  ON public.meter_shop_linkages FOR DELETE
  USING (public.has_project_access(auth.uid(), project_id) OR public.is_admin(auth.uid()));

-- RLS Policies for load_profile_readings (via profile)
CREATE POLICY "Users can view readings for their profiles"
  ON public.load_profile_readings FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.load_profiles lp 
    WHERE lp.id = profile_id 
    AND (public.has_project_access(auth.uid(), lp.project_id) OR public.is_admin(auth.uid()))
  ));

CREATE POLICY "Users can create readings for their profiles"
  ON public.load_profile_readings FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.load_profiles lp 
    WHERE lp.id = profile_id 
    AND (public.has_project_access(auth.uid(), lp.project_id) OR public.is_admin(auth.uid()))
  ));

CREATE POLICY "Users can update readings for their profiles"
  ON public.load_profile_readings FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.load_profiles lp 
    WHERE lp.id = profile_id 
    AND (public.has_project_access(auth.uid(), lp.project_id) OR public.is_admin(auth.uid()))
  ));

CREATE POLICY "Users can delete readings for their profiles"
  ON public.load_profile_readings FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.load_profiles lp 
    WHERE lp.id = profile_id 
    AND (public.has_project_access(auth.uid(), lp.project_id) OR public.is_admin(auth.uid()))
  ));

-- RLS Policies for load_category_summary
CREATE POLICY "Users can view category summaries for their profiles"
  ON public.load_category_summary FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.load_profiles lp 
    WHERE lp.id = profile_id 
    AND (public.has_project_access(auth.uid(), lp.project_id) OR public.is_admin(auth.uid()))
  ));

CREATE POLICY "Users can manage category summaries for their profiles"
  ON public.load_category_summary FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.load_profiles lp 
    WHERE lp.id = profile_id 
    AND (public.has_project_access(auth.uid(), lp.project_id) OR public.is_admin(auth.uid()))
  ));

-- Trigger for updated_at
CREATE TRIGGER update_load_profiles_updated_at
  BEFORE UPDATE ON public.load_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_meter_shop_linkages_updated_at
  BEFORE UPDATE ON public.meter_shop_linkages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_load_category_summary_updated_at
  BEFORE UPDATE ON public.load_category_summary
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes for performance
CREATE INDEX idx_load_profiles_project ON public.load_profiles(project_id);
CREATE INDEX idx_load_profiles_document ON public.load_profiles(document_id);
CREATE INDEX idx_meter_shop_linkages_profile ON public.meter_shop_linkages(profile_id);
CREATE INDEX idx_meter_shop_linkages_project ON public.meter_shop_linkages(project_id);
CREATE INDEX idx_load_profile_readings_profile ON public.load_profile_readings(profile_id);
CREATE INDEX idx_load_profile_readings_date ON public.load_profile_readings(reading_date);
CREATE INDEX idx_load_category_summary_profile ON public.load_category_summary(profile_id);