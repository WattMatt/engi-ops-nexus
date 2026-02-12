
-- Add auto_renew flag to contractor portal tokens (default true for convenience)
ALTER TABLE public.contractor_portal_tokens
ADD COLUMN auto_renew BOOLEAN NOT NULL DEFAULT true;

-- Add renewal_count to track how many times a token has been auto-renewed
ALTER TABLE public.contractor_portal_tokens
ADD COLUMN renewal_count INTEGER NOT NULL DEFAULT 0;

-- Add last_renewed_at to track when auto-renewal last occurred
ALTER TABLE public.contractor_portal_tokens
ADD COLUMN last_renewed_at TIMESTAMPTZ;

COMMENT ON COLUMN public.contractor_portal_tokens.auto_renew IS 'When true, the daily cron job will automatically extend the token 7 days before expiry';
COMMENT ON COLUMN public.contractor_portal_tokens.renewal_count IS 'Number of times this token has been auto-renewed';
COMMENT ON COLUMN public.contractor_portal_tokens.last_renewed_at IS 'Timestamp of the most recent auto-renewal';
