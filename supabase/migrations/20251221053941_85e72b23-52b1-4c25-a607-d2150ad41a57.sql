-- Fix security definer views by recreating them with security_invoker = true
DROP VIEW IF EXISTS public.material_rate_analytics;
DROP VIEW IF EXISTS public.material_rate_by_province;
DROP VIEW IF EXISTS public.material_rate_by_contractor;

-- Recreate views with SECURITY INVOKER (default, but explicit)
CREATE VIEW public.material_rate_analytics 
WITH (security_invoker = true)
AS
SELECT 
  m.id as material_id,
  m.material_code,
  m.material_name,
  m.standard_supply_cost,
  m.standard_install_cost,
  m.unit,
  mc.category_name,
  COUNT(mrs.id) as source_count,
  AVG(mrs.supply_rate) as avg_supply_rate,
  AVG(mrs.install_rate) as avg_install_rate,
  AVG(mrs.total_rate) as avg_total_rate,
  MIN(mrs.total_rate) as min_total_rate,
  MAX(mrs.total_rate) as max_total_rate,
  STDDEV(mrs.total_rate) as rate_stddev,
  array_agg(DISTINCT mrs.contractor_name) FILTER (WHERE mrs.contractor_name IS NOT NULL) as contractors,
  array_agg(DISTINCT mrs.province) FILTER (WHERE mrs.province IS NOT NULL) as provinces
FROM public.master_materials m
LEFT JOIN public.material_rate_sources mrs ON mrs.material_id = m.id
LEFT JOIN public.material_categories mc ON mc.id = m.category_id
WHERE m.is_active = true
GROUP BY m.id, m.material_code, m.material_name, m.standard_supply_cost, m.standard_install_cost, m.unit, mc.category_name;

CREATE VIEW public.material_rate_by_province
WITH (security_invoker = true)
AS
SELECT 
  m.id as material_id,
  m.material_code,
  m.material_name,
  mrs.province,
  COUNT(mrs.id) as source_count,
  AVG(mrs.supply_rate) as avg_supply_rate,
  AVG(mrs.install_rate) as avg_install_rate,
  AVG(mrs.total_rate) as avg_total_rate,
  MIN(mrs.total_rate) as min_rate,
  MAX(mrs.total_rate) as max_rate
FROM public.master_materials m
JOIN public.material_rate_sources mrs ON mrs.material_id = m.id
WHERE m.is_active = true AND mrs.province IS NOT NULL
GROUP BY m.id, m.material_code, m.material_name, mrs.province;

CREATE VIEW public.material_rate_by_contractor
WITH (security_invoker = true)
AS
SELECT 
  m.id as material_id,
  m.material_code,
  m.material_name,
  mrs.contractor_name,
  COUNT(mrs.id) as source_count,
  AVG(mrs.supply_rate) as avg_supply_rate,
  AVG(mrs.install_rate) as avg_install_rate,
  AVG(mrs.total_rate) as avg_total_rate,
  MIN(mrs.tender_date) as earliest_tender,
  MAX(mrs.tender_date) as latest_tender
FROM public.master_materials m
JOIN public.material_rate_sources mrs ON mrs.material_id = m.id
WHERE m.is_active = true AND mrs.contractor_name IS NOT NULL
GROUP BY m.id, m.material_code, m.material_name, mrs.contractor_name;