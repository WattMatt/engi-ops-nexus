-- Add auto_generate_invoices column to invoice_notification_settings
ALTER TABLE public.invoice_notification_settings 
ADD COLUMN auto_generate_invoices BOOLEAN DEFAULT false;