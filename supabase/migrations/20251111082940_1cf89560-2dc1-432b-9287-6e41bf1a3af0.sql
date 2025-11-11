-- Add sub_entries column to site_diary_entries table
ALTER TABLE site_diary_entries ADD COLUMN IF NOT EXISTS sub_entries JSONB;