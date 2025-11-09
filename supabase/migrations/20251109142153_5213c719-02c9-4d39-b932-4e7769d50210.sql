-- Add additional fields to bulk_services_documents for better reporting
ALTER TABLE public.bulk_services_documents
ADD COLUMN project_area NUMERIC(10,2),
ADD COLUMN va_per_sqm NUMERIC(6,2),
ADD COLUMN climatic_zone TEXT,
ADD COLUMN prepared_by TEXT,
ADD COLUMN prepared_by_contact TEXT,
ADD COLUMN client_name TEXT,
ADD COLUMN architect TEXT;

COMMENT ON COLUMN public.bulk_services_documents.project_area IS 'Total project area in square meters';
COMMENT ON COLUMN public.bulk_services_documents.va_per_sqm IS 'Applied load in VA per square meter based on SANS 204';
COMMENT ON COLUMN public.bulk_services_documents.climatic_zone IS 'South African climatic zone (1-5)';
COMMENT ON COLUMN public.bulk_services_documents.prepared_by IS 'Consultant name preparing the report';
COMMENT ON COLUMN public.bulk_services_documents.prepared_by_contact IS 'Contact person at consultant';
COMMENT ON COLUMN public.bulk_services_documents.client_name IS 'Client name for the project';
COMMENT ON COLUMN public.bulk_services_documents.architect IS 'Architect firm name';