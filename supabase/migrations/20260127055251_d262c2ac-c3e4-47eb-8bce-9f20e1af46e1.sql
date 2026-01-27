-- Add dropbox_folder_path column to projects table
ALTER TABLE projects ADD COLUMN IF NOT EXISTS dropbox_folder_path TEXT;

COMMENT ON COLUMN projects.dropbox_folder_path IS 'Dropbox folder path for storing project files and exports';