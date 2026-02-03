-- Create inspection_requests table for contractor QC inspection requests
CREATE TABLE IF NOT EXISTS public.inspection_requests (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    inspection_type TEXT NOT NULL,
    location TEXT NOT NULL,
    description TEXT,
    requested_date DATE NOT NULL,
    requested_by_name TEXT NOT NULL,
    requested_by_email TEXT NOT NULL,
    company_name TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    response_notes TEXT,
    scheduled_date DATE,
    completed_date DATE,
    completed_by UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create project_metadata table for storing arbitrary JSON metadata per project
CREATE TABLE IF NOT EXISTS public.project_metadata (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    key TEXT NOT NULL,
    value JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT unique_project_metadata UNIQUE (project_id, key)
);

-- Enable RLS
ALTER TABLE public.inspection_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_metadata ENABLE ROW LEVEL SECURITY;

-- RLS Policies for inspection_requests
CREATE POLICY "Users can view inspection requests for their projects"
ON public.inspection_requests FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.project_members pm
        WHERE pm.project_id = inspection_requests.project_id
        AND pm.user_id = auth.uid()
    )
);

CREATE POLICY "Users can create inspection requests"
ON public.inspection_requests FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can update inspection requests for their projects"
ON public.inspection_requests FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.project_members pm
        WHERE pm.project_id = inspection_requests.project_id
        AND pm.user_id = auth.uid()
    )
);

-- RLS Policies for project_metadata
CREATE POLICY "Users can view metadata for their projects"
ON public.project_metadata FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.project_members pm
        WHERE pm.project_id = project_metadata.project_id
        AND pm.user_id = auth.uid()
    )
);

CREATE POLICY "Users can insert metadata for their projects"
ON public.project_metadata FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.project_members pm
        WHERE pm.project_id = project_metadata.project_id
        AND pm.user_id = auth.uid()
    )
);

CREATE POLICY "Users can update metadata for their projects"
ON public.project_metadata FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.project_members pm
        WHERE pm.project_id = project_metadata.project_id
        AND pm.user_id = auth.uid()
    )
);

-- Trigger for updated_at
CREATE TRIGGER update_inspection_requests_updated_at
BEFORE UPDATE ON public.inspection_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_project_metadata_updated_at
BEFORE UPDATE ON public.project_metadata
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();