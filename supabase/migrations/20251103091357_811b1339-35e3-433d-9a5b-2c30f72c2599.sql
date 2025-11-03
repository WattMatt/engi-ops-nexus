-- Create task groups table for organizing tasks into sections
CREATE TABLE IF NOT EXISTS task_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#3b82f6',
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create task labels table
CREATE TABLE IF NOT EXISTS task_labels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#3b82f6',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create junction table for task-label relationships
CREATE TABLE IF NOT EXISTS task_label_assignments (
  task_id UUID NOT NULL REFERENCES site_diary_tasks(id) ON DELETE CASCADE,
  label_id UUID NOT NULL REFERENCES task_labels(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (task_id, label_id)
);

-- Create task subtasks table
CREATE TABLE IF NOT EXISTS task_subtasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_task_id UUID NOT NULL REFERENCES site_diary_tasks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  completed BOOLEAN DEFAULT false,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create task comments table
CREATE TABLE IF NOT EXISTS task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES site_diary_tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  mentioned_users UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create task attachments table
CREATE TABLE IF NOT EXISTS task_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES site_diary_tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT,
  file_type TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create task dependencies table
CREATE TABLE IF NOT EXISTS task_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES site_diary_tasks(id) ON DELETE CASCADE,
  depends_on_task_id UUID NOT NULL REFERENCES site_diary_tasks(id) ON DELETE CASCADE,
  dependency_type TEXT DEFAULT 'finish_to_start',
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT no_self_dependency CHECK (task_id != depends_on_task_id)
);

-- Create task activity log table
CREATE TABLE IF NOT EXISTS task_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES site_diary_tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add new columns to site_diary_tasks for Monday.com features
ALTER TABLE site_diary_tasks 
  ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES task_groups(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  ADD COLUMN IF NOT EXISTS time_tracked_hours DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS position INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS view_type TEXT DEFAULT 'board';

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_task_groups_project ON task_groups(project_id);
CREATE INDEX IF NOT EXISTS idx_task_labels_project ON task_labels(project_id);
CREATE INDEX IF NOT EXISTS idx_task_subtasks_parent ON task_subtasks(parent_task_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_task ON task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_user ON task_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_task_attachments_task ON task_attachments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_dependencies_task ON task_dependencies(task_id);
CREATE INDEX IF NOT EXISTS idx_task_activity_logs_task ON task_activity_logs(task_id);

-- Create triggers for updated_at
CREATE TRIGGER update_task_groups_updated_at
  BEFORE UPDATE ON task_groups
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_task_subtasks_updated_at
  BEFORE UPDATE ON task_subtasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_task_comments_updated_at
  BEFORE UPDATE ON task_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS on all new tables
ALTER TABLE task_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_label_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_subtasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_activity_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for task_groups
CREATE POLICY "Users can view task groups in their projects"
  ON task_groups FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = task_groups.project_id
      AND project_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create task groups in their projects"
  ON task_groups FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = task_groups.project_id
      AND project_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update task groups in their projects"
  ON task_groups FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = task_groups.project_id
      AND project_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete task groups in their projects"
  ON task_groups FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = task_groups.project_id
      AND project_members.user_id = auth.uid()
    )
  );

-- RLS Policies for task_labels (similar pattern)
CREATE POLICY "Users can view labels in their projects"
  ON task_labels FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = task_labels.project_id
      AND project_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create labels in their projects"
  ON task_labels FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = task_labels.project_id
      AND project_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update labels in their projects"
  ON task_labels FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = task_labels.project_id
      AND project_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete labels in their projects"
  ON task_labels FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = task_labels.project_id
      AND project_members.user_id = auth.uid()
    )
  );

-- RLS Policies for task_label_assignments
CREATE POLICY "Users can view label assignments in their projects"
  ON task_label_assignments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM site_diary_tasks
      JOIN project_members ON project_members.project_id = site_diary_tasks.project_id
      WHERE site_diary_tasks.id = task_label_assignments.task_id
      AND project_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create label assignments in their projects"
  ON task_label_assignments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM site_diary_tasks
      JOIN project_members ON project_members.project_id = site_diary_tasks.project_id
      WHERE site_diary_tasks.id = task_label_assignments.task_id
      AND project_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete label assignments in their projects"
  ON task_label_assignments FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM site_diary_tasks
      JOIN project_members ON project_members.project_id = site_diary_tasks.project_id
      WHERE site_diary_tasks.id = task_label_assignments.task_id
      AND project_members.user_id = auth.uid()
    )
  );

-- RLS Policies for task_subtasks
CREATE POLICY "Users can view subtasks in their projects"
  ON task_subtasks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM site_diary_tasks
      JOIN project_members ON project_members.project_id = site_diary_tasks.project_id
      WHERE site_diary_tasks.id = task_subtasks.parent_task_id
      AND project_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create subtasks in their projects"
  ON task_subtasks FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM site_diary_tasks
      JOIN project_members ON project_members.project_id = site_diary_tasks.project_id
      WHERE site_diary_tasks.id = task_subtasks.parent_task_id
      AND project_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update subtasks in their projects"
  ON task_subtasks FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM site_diary_tasks
      JOIN project_members ON project_members.project_id = site_diary_tasks.project_id
      WHERE site_diary_tasks.id = task_subtasks.parent_task_id
      AND project_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete subtasks in their projects"
  ON task_subtasks FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM site_diary_tasks
      JOIN project_members ON project_members.project_id = site_diary_tasks.project_id
      WHERE site_diary_tasks.id = task_subtasks.parent_task_id
      AND project_members.user_id = auth.uid()
    )
  );

-- RLS Policies for task_comments
CREATE POLICY "Users can view comments in their projects"
  ON task_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM site_diary_tasks
      JOIN project_members ON project_members.project_id = site_diary_tasks.project_id
      WHERE site_diary_tasks.id = task_comments.task_id
      AND project_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create comments in their projects"
  ON task_comments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM site_diary_tasks
      JOIN project_members ON project_members.project_id = site_diary_tasks.project_id
      WHERE site_diary_tasks.id = task_comments.task_id
      AND project_members.user_id = auth.uid()
    )
    AND user_id = auth.uid()
  );

CREATE POLICY "Users can update their own comments"
  ON task_comments FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own comments"
  ON task_comments FOR DELETE
  USING (user_id = auth.uid());

-- RLS Policies for task_attachments
CREATE POLICY "Users can view attachments in their projects"
  ON task_attachments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM site_diary_tasks
      JOIN project_members ON project_members.project_id = site_diary_tasks.project_id
      WHERE site_diary_tasks.id = task_attachments.task_id
      AND project_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create attachments in their projects"
  ON task_attachments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM site_diary_tasks
      JOIN project_members ON project_members.project_id = site_diary_tasks.project_id
      WHERE site_diary_tasks.id = task_attachments.task_id
      AND project_members.user_id = auth.uid()
    )
    AND user_id = auth.uid()
  );

CREATE POLICY "Users can delete their own attachments"
  ON task_attachments FOR DELETE
  USING (user_id = auth.uid());

-- RLS Policies for task_dependencies
CREATE POLICY "Users can view dependencies in their projects"
  ON task_dependencies FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM site_diary_tasks
      JOIN project_members ON project_members.project_id = site_diary_tasks.project_id
      WHERE site_diary_tasks.id = task_dependencies.task_id
      AND project_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create dependencies in their projects"
  ON task_dependencies FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM site_diary_tasks
      JOIN project_members ON project_members.project_id = site_diary_tasks.project_id
      WHERE site_diary_tasks.id = task_dependencies.task_id
      AND project_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete dependencies in their projects"
  ON task_dependencies FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM site_diary_tasks
      JOIN project_members ON project_members.project_id = site_diary_tasks.project_id
      WHERE site_diary_tasks.id = task_dependencies.task_id
      AND project_members.user_id = auth.uid()
    )
  );

-- RLS Policies for task_activity_logs
CREATE POLICY "Users can view activity logs in their projects"
  ON task_activity_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM site_diary_tasks
      JOIN project_members ON project_members.project_id = site_diary_tasks.project_id
      WHERE site_diary_tasks.id = task_activity_logs.task_id
      AND project_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create activity logs in their projects"
  ON task_activity_logs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM site_diary_tasks
      JOIN project_members ON project_members.project_id = site_diary_tasks.project_id
      WHERE site_diary_tasks.id = task_activity_logs.task_id
      AND project_members.user_id = auth.uid()
    )
    AND user_id = auth.uid()
  );

-- Create storage bucket for task attachments
INSERT INTO storage.buckets (id, name, public) 
VALUES ('task-attachments', 'task-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for task attachments
CREATE POLICY "Users can view task attachments in their projects"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'task-attachments' AND
    EXISTS (
      SELECT 1 FROM task_attachments
      JOIN site_diary_tasks ON site_diary_tasks.id = task_attachments.task_id
      JOIN project_members ON project_members.project_id = site_diary_tasks.project_id
      WHERE task_attachments.file_path = storage.objects.name
      AND project_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can upload task attachments to their projects"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'task-attachments' AND
    auth.uid() IS NOT NULL
  );

CREATE POLICY "Users can delete their own task attachments"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'task-attachments' AND
    auth.uid() IS NOT NULL
  );