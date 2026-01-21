-- Add load_profile_completed field to track actual load profile analysis completion
ALTER TABLE public.bulk_services_documents
ADD COLUMN load_profile_completed BOOLEAN DEFAULT false;

COMMENT ON COLUMN public.bulk_services_documents.load_profile_completed IS 'Set to true when load profile analysis (daily/seasonal variations) is complete';