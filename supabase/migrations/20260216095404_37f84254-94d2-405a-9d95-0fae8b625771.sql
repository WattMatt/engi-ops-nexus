
-- Add engine_version column to tables that are missing it
ALTER TABLE public.specification_reports ADD COLUMN IF NOT EXISTS engine_version TEXT DEFAULT NULL;
ALTER TABLE public.tenant_tracker_reports ADD COLUMN IF NOT EXISTS engine_version TEXT DEFAULT NULL;
ALTER TABLE public.tenant_evaluation_reports ADD COLUMN IF NOT EXISTS engine_version TEXT DEFAULT NULL;
ALTER TABLE public.verification_certificate_reports ADD COLUMN IF NOT EXISTS engine_version TEXT DEFAULT NULL;
