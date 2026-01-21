-- Add transformer_size_kva field for 400V supply cases
ALTER TABLE public.bulk_services_documents
ADD COLUMN transformer_size_kva NUMERIC;

COMMENT ON COLUMN public.bulk_services_documents.transformer_size_kva IS 'Transformer size in kVA - only applicable when primary_voltage is 400V';