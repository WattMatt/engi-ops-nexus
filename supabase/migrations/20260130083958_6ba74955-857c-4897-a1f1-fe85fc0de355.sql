-- Create handover folders table for hierarchical folder structure
CREATE TABLE public.handover_folders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  parent_folder_id UUID REFERENCES public.handover_folders(id) ON DELETE CASCADE,
  folder_name TEXT NOT NULL,
  document_category TEXT NOT NULL, -- matches the tab categories: generators, transformers, etc.
  folder_path TEXT, -- full path for display e.g. "Root/SubFolder1/SubFolder2"
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add folder reference to handover_documents
ALTER TABLE public.handover_documents 
ADD COLUMN folder_id UUID REFERENCES public.handover_folders(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.handover_folders ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for handover_folders
CREATE POLICY "Users can view handover folders for their projects"
ON public.handover_folders
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.project_members pm
    WHERE pm.project_id = handover_folders.project_id
    AND pm.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create handover folders for their projects"
ON public.handover_folders
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.project_members pm
    WHERE pm.project_id = handover_folders.project_id
    AND pm.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update handover folders for their projects"
ON public.handover_folders
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.project_members pm
    WHERE pm.project_id = handover_folders.project_id
    AND pm.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete handover folders for their projects"
ON public.handover_folders
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.project_members pm
    WHERE pm.project_id = handover_folders.project_id
    AND pm.user_id = auth.uid()
  )
);

-- Create index for faster folder queries
CREATE INDEX idx_handover_folders_project_category ON public.handover_folders(project_id, document_category);
CREATE INDEX idx_handover_folders_parent ON public.handover_folders(parent_folder_id);
CREATE INDEX idx_handover_documents_folder ON public.handover_documents(folder_id);

-- Function to update folder path when parent changes
CREATE OR REPLACE FUNCTION public.update_folder_path()
RETURNS TRIGGER AS $$
DECLARE
  parent_path TEXT;
BEGIN
  IF NEW.parent_folder_id IS NULL THEN
    NEW.folder_path := NEW.folder_name;
  ELSE
    SELECT folder_path INTO parent_path
    FROM public.handover_folders
    WHERE id = NEW.parent_folder_id;
    
    NEW.folder_path := parent_path || '/' || NEW.folder_name;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to auto-update folder path
CREATE TRIGGER update_handover_folder_path
BEFORE INSERT OR UPDATE OF folder_name, parent_folder_id ON public.handover_folders
FOR EACH ROW
EXECUTE FUNCTION public.update_folder_path();

-- Trigger for updated_at
CREATE TRIGGER update_handover_folders_updated_at
BEFORE UPDATE ON public.handover_folders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();