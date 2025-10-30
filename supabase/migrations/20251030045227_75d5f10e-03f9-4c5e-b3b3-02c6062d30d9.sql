-- Clear all invoicing-related data
DELETE FROM invoice_uploads;

-- Clear invoices table if it exists
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'invoices') THEN
    DELETE FROM invoices;
  END IF;
END $$;

-- Clear invoice_projects table if it exists
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'invoice_projects') THEN
    DELETE FROM invoice_projects;
  END IF;
END $$;