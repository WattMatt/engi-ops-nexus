-- Add source BOQ tracking columns
ALTER TABLE public.final_accounts 
ADD COLUMN IF NOT EXISTS source_boq_upload_id UUID REFERENCES public.boq_uploads(id);

ALTER TABLE public.final_account_items 
ADD COLUMN IF NOT EXISTS source_boq_item_id UUID REFERENCES public.boq_extracted_items(id);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_final_account_items_source_boq ON public.final_account_items(source_boq_item_id) WHERE source_boq_item_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_final_accounts_source_boq ON public.final_accounts(source_boq_upload_id) WHERE source_boq_upload_id IS NOT NULL;