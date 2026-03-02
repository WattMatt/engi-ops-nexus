
-- =============================================
-- NEXUS BUDGET ENGINE - DATABASE SCHEMA
-- =============================================

-- 1. Budget status enum
CREATE TYPE public.budget_status AS ENUM ('draft', 'active', 'final');
CREATE TYPE public.scope_status AS ENUM ('yes', 'no');
CREATE TYPE public.standby_source AS ENUM ('centre_generator', 'tenant_own_supply');

-- =============================================
-- A. GLOBAL CONFIGURATION TABLES
-- =============================================

-- Master Market Rates
CREATE TABLE public.master_market_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rate_type TEXT NOT NULL,
  year INTEGER NOT NULL,
  rate_per_m2 NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(rate_type, year)
);

-- Master Tenant Profiles
CREATE TABLE public.master_tenant_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_name TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL DEFAULT 'Line Shop',
  default_ti_rate NUMERIC NOT NULL DEFAULT 0,
  apply_base_rate BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Master DB Rates
CREATE TABLE public.master_db_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  db_size TEXT NOT NULL UNIQUE,
  allowance NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Master Transformer Sizes
CREATE TABLE public.master_transformer_sizes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  size_kva INTEGER NOT NULL UNIQUE,
  allowance NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Master Generator Rates
CREATE TABLE public.master_generator_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  size_kva INTEGER NOT NULL UNIQUE,
  allowance NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- B. PROJECT BUDGET TABLES
-- =============================================

-- Project Budgets
CREATE TABLE public.project_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  revision INTEGER NOT NULL DEFAULT 0,
  status budget_status NOT NULL DEFAULT 'draft',
  base_rate_m2 NUMERIC NOT NULL DEFAULT 290,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(project_id, revision)
);

-- Project Standby Config
CREATE TABLE public.project_standby_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id UUID NOT NULL REFERENCES public.project_budgets(id) ON DELETE CASCADE UNIQUE,
  load_factor_va_m2 NUMERIC NOT NULL DEFAULT 30,
  power_factor NUMERIC NOT NULL DEFAULT 0.8,
  selected_generator_kva INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Project Scope (Confirmation Sheet)
CREATE TABLE public.project_scope (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id UUID NOT NULL REFERENCES public.project_budgets(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  status scope_status,
  comments TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(budget_id, item_name)
);

-- Project Tenants (The Driver)
CREATE TABLE public.project_tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id UUID NOT NULL REFERENCES public.project_budgets(id) ON DELETE CASCADE,
  shop_no TEXT NOT NULL,
  shop_name TEXT NOT NULL,
  area_m2 NUMERIC NOT NULL DEFAULT 0,
  db_size TEXT,
  standby_source standby_source NOT NULL DEFAULT 'tenant_own_supply',
  override_ti_rate NUMERIC,
  matched_profile_id UUID REFERENCES public.master_tenant_profiles(id),
  snapshotted_ti_rate NUMERIC,
  snapshotted_base_rate NUMERIC,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Project Zoning
CREATE TABLE public.project_zoning (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id UUID NOT NULL REFERENCES public.project_budgets(id) ON DELETE CASCADE,
  zone_name TEXT NOT NULL,
  transformer_size_id UUID REFERENCES public.master_transformer_sizes(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tenant-Zone assignment (many-to-one)
CREATE TABLE public.project_tenant_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.project_tenants(id) ON DELETE CASCADE,
  zone_id UUID NOT NULL REFERENCES public.project_zoning(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id)
);

-- =============================================
-- C. TRIGGERS
-- =============================================

-- Auto-calculate DB size on tenant insert/update
CREATE OR REPLACE FUNCTION public.auto_size_db()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.db_size := CASE
    WHEN NEW.area_m2 <= 80 THEN '80A TP'
    WHEN NEW.area_m2 <= 150 THEN '100A TP'
    WHEN NEW.area_m2 <= 250 THEN '120A TP'
    WHEN NEW.area_m2 <= 400 THEN '150A TP'
    WHEN NEW.area_m2 <= 650 THEN '200A TP'
    ELSE 'Special'
  END;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_size_db
  BEFORE INSERT OR UPDATE OF area_m2
  ON public.project_tenants
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_size_db();

-- Updated_at triggers
CREATE TRIGGER trg_project_budgets_updated
  BEFORE UPDATE ON public.project_budgets
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trg_project_tenants_updated
  BEFORE UPDATE ON public.project_tenants
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trg_project_scope_updated
  BEFORE UPDATE ON public.project_scope
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trg_project_standby_updated
  BEFORE UPDATE ON public.project_standby_config
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =============================================
-- D. RLS POLICIES
-- =============================================

ALTER TABLE public.master_market_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.master_tenant_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.master_db_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.master_transformer_sizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.master_generator_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_standby_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_scope ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_zoning ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_tenant_zones ENABLE ROW LEVEL SECURITY;

-- Master tables: read for all authenticated, write for admins
CREATE POLICY "Authenticated read master_market_rates" ON public.master_market_rates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin write master_market_rates" ON public.master_market_rates FOR ALL TO authenticated USING (public.is_admin(auth.uid()));

CREATE POLICY "Authenticated read master_tenant_profiles" ON public.master_tenant_profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin write master_tenant_profiles" ON public.master_tenant_profiles FOR ALL TO authenticated USING (public.is_admin(auth.uid()));

CREATE POLICY "Authenticated read master_db_rates" ON public.master_db_rates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin write master_db_rates" ON public.master_db_rates FOR ALL TO authenticated USING (public.is_admin(auth.uid()));

CREATE POLICY "Authenticated read master_transformer_sizes" ON public.master_transformer_sizes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin write master_transformer_sizes" ON public.master_transformer_sizes FOR ALL TO authenticated USING (public.is_admin(auth.uid()));

CREATE POLICY "Authenticated read master_generator_rates" ON public.master_generator_rates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin write master_generator_rates" ON public.master_generator_rates FOR ALL TO authenticated USING (public.is_admin(auth.uid()));

-- Project budget tables: access via project membership
CREATE POLICY "Project members manage budgets" ON public.project_budgets FOR ALL TO authenticated
  USING (public.has_project_access(auth.uid(), project_id));

CREATE POLICY "Project members manage standby config" ON public.project_standby_config FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.project_budgets pb WHERE pb.id = budget_id AND public.has_project_access(auth.uid(), pb.project_id)));

CREATE POLICY "Project members manage scope" ON public.project_scope FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.project_budgets pb WHERE pb.id = budget_id AND public.has_project_access(auth.uid(), pb.project_id)));

CREATE POLICY "Project members manage tenants" ON public.project_tenants FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.project_budgets pb WHERE pb.id = budget_id AND public.has_project_access(auth.uid(), pb.project_id)));

CREATE POLICY "Project members manage zoning" ON public.project_zoning FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.project_budgets pb WHERE pb.id = budget_id AND public.has_project_access(auth.uid(), pb.project_id)));

CREATE POLICY "Project members manage tenant zones" ON public.project_tenant_zones FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.project_tenants pt
    JOIN public.project_budgets pb ON pb.id = pt.budget_id
    WHERE pt.id = tenant_id AND public.has_project_access(auth.uid(), pb.project_id)
  ));

-- =============================================
-- E. SEED DATA
-- =============================================

-- Seed master DB rates
INSERT INTO public.master_db_rates (db_size, allowance) VALUES
  ('80A TP', 11000),
  ('100A TP', 13500),
  ('120A TP', 16000),
  ('150A TP', 19000),
  ('200A TP', 24000);

-- Seed master transformer sizes
INSERT INTO public.master_transformer_sizes (size_kva, allowance) VALUES
  (315, 450000),
  (500, 600000),
  (800, 850000),
  (1000, 1050000);

-- Seed master generator rates
INSERT INTO public.master_generator_rates (size_kva, allowance) VALUES
  (250, 350000),
  (500, 650000),
  (800, 950000),
  (1000, 1200000);

-- Seed master market rates
INSERT INTO public.master_market_rates (rate_type, year, rate_per_m2) VALUES
  ('Retail Line Shop Base', 2024, 270),
  ('Retail Line Shop Base', 2025, 290),
  ('Commercial Office Base', 2024, 250),
  ('Commercial Office Base', 2025, 270);

-- Seed common tenant profiles
INSERT INTO public.master_tenant_profiles (tenant_name, category, default_ti_rate, apply_base_rate) VALUES
  ('Jet', 'Fashion Anchor', 500, true),
  ('Boxer', 'Supermarket', 450, true),
  ('Truworths', 'Fashion Anchor', 550, true),
  ('Shoprite', 'Supermarket', 400, true),
  ('Checkers', 'Supermarket', 400, true),
  ('Pick n Pay', 'Supermarket', 450, true),
  ('Woolworths', 'Fashion Anchor', 600, true),
  ('Mr Price', 'Fashion Anchor', 480, true),
  ('Clicks', 'Health & Beauty', 420, true),
  ('Dis-Chem', 'Health & Beauty', 450, true),
  ('Pep', 'Value Retailer', 350, true),
  ('Ackermans', 'Value Retailer', 380, true),
  ('Game', 'Electronics', 500, true),
  ('Edgars', 'Fashion Anchor', 550, true),
  ('Spar', 'Supermarket', 380, true);
