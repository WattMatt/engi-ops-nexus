ALTER TABLE site_diary_entries
ADD COLUMN IF NOT EXISTS entry_type text DEFAULT 'general',
ADD COLUMN IF NOT EXISTS site_progress text,
ADD COLUMN IF NOT EXISTS weather_conditions text,
ADD COLUMN IF NOT EXISTS temperature text,
ADD COLUMN IF NOT EXISTS wind_conditions text,
ADD COLUMN IF NOT EXISTS queries text,
ADD COLUMN IF NOT EXISTS safety_observations text,
ADD COLUMN IF NOT EXISTS quality_issues text,
ADD COLUMN IF NOT EXISTS delays_disruptions text,
ADD COLUMN IF NOT EXISTS status text DEFAULT 'draft',
ADD COLUMN IF NOT EXISTS attachment_urls text[] DEFAULT '{}';