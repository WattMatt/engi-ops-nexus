-- Add has_subsections flag to sections to enable shop breakdown for any section
ALTER TABLE final_account_sections 
ADD COLUMN IF NOT EXISTS has_subsections BOOLEAN DEFAULT false;

COMMENT ON COLUMN final_account_sections.has_subsections IS 'Enable shop/tenant breakdown for this section';