-- Make changed_by and change_reason nullable for system/edge function updates
ALTER TABLE public.material_price_audit
ALTER COLUMN changed_by DROP NOT NULL;

ALTER TABLE public.material_price_audit
ALTER COLUMN change_reason DROP NOT NULL;

-- Set a default value for change_reason
ALTER TABLE public.material_price_audit
ALTER COLUMN change_reason SET DEFAULT 'System update';