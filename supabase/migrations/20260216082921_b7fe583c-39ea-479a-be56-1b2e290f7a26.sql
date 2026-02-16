
-- Add engine_version column to all PDF report tables for telemetry tracking
-- This enables the PDF Compliance Dashboard to show REAL migration status

ALTER TABLE public.cost_report_pdfs ADD COLUMN IF NOT EXISTS engine_version text DEFAULT 'unknown';
ALTER TABLE public.generator_reports ADD COLUMN IF NOT EXISTS engine_version text DEFAULT 'unknown';
ALTER TABLE public.cable_schedule_reports ADD COLUMN IF NOT EXISTS engine_version text DEFAULT 'unknown';
ALTER TABLE public.electrical_budget_reports ADD COLUMN IF NOT EXISTS engine_version text DEFAULT 'unknown';
ALTER TABLE public.bulk_services_reports ADD COLUMN IF NOT EXISTS engine_version text DEFAULT 'unknown';
ALTER TABLE public.floor_plan_reports ADD COLUMN IF NOT EXISTS engine_version text DEFAULT 'unknown';
ALTER TABLE public.legend_card_reports ADD COLUMN IF NOT EXISTS engine_version text DEFAULT 'unknown';
ALTER TABLE public.handover_completion_reports ADD COLUMN IF NOT EXISTS engine_version text DEFAULT 'unknown';
ALTER TABLE public.ai_prediction_reports ADD COLUMN IF NOT EXISTS engine_version text DEFAULT 'unknown';
ALTER TABLE public.final_account_reports ADD COLUMN IF NOT EXISTS engine_version text DEFAULT 'unknown';
ALTER TABLE public.project_outline_reports ADD COLUMN IF NOT EXISTS engine_version text DEFAULT 'unknown';
ALTER TABLE public.site_diary_reports ADD COLUMN IF NOT EXISTS engine_version text DEFAULT 'unknown';

-- Add indexes for efficient dashboard queries
CREATE INDEX IF NOT EXISTS idx_cost_report_pdfs_engine ON public.cost_report_pdfs(engine_version);
CREATE INDEX IF NOT EXISTS idx_generator_reports_engine ON public.generator_reports(engine_version);
