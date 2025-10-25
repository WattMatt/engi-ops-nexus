-- Create enum for task status
CREATE TYPE task_status AS ENUM ('pending', 'in_progress', 'completed', 'cancelled');

-- Create enum for task priority
CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high', 'urgent');

-- Add missing columns to site_diary_entries
ALTER TABLE site_diary_entries
ADD COLUMN IF NOT EXISTS meeting_minutes TEXT,
ADD COLUMN IF NOT EXISTS attendees JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;

-- Create table for site diary tasks
CREATE TABLE IF NOT EXISTS site_diary_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  diary_entry_id UUID REFERENCES site_diary_entries(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_by UUID REFERENCES auth.users(id) NOT NULL,
  status task_status DEFAULT 'pending' NOT NULL,
  priority task_priority DEFAULT 'medium' NOT NULL,
  due_date DATE,
  start_date DATE,
  completion_date TIMESTAMP WITH TIME ZONE,
  estimated_hours NUMERIC,
  actual_hours NUMERIC,
  dependencies JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create table for task comments
CREATE TABLE IF NOT EXISTS task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES site_diary_tasks(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  comment TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create table for user reminders
CREATE TABLE IF NOT EXISTS user_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  task_id UUID REFERENCES site_diary_tasks(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  reminder_date TIMESTAMP WITH TIME ZONE NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_site_diary_tasks_project_id ON site_diary_tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_site_diary_tasks_assigned_to ON site_diary_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_site_diary_tasks_status ON site_diary_tasks(status);
CREATE INDEX IF NOT EXISTS idx_site_diary_tasks_due_date ON site_diary_tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_user_reminders_user_id ON user_reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_user_reminders_is_read ON user_reminders(is_read);

-- Enable RLS
ALTER TABLE site_diary_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_reminders ENABLE ROW LEVEL SECURITY;

-- RLS Policies for site_diary_tasks
CREATE POLICY "Users can view tasks in their projects"
  ON site_diary_tasks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = site_diary_tasks.project_id
      AND project_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create tasks in their projects"
  ON site_diary_tasks FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = site_diary_tasks.project_id
      AND project_members.user_id = auth.uid()
    )
    AND assigned_by = auth.uid()
  );

CREATE POLICY "Users can update tasks in their projects"
  ON site_diary_tasks FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = site_diary_tasks.project_id
      AND project_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete tasks they created"
  ON site_diary_tasks FOR DELETE
  USING (assigned_by = auth.uid());

-- RLS Policies for task_comments
CREATE POLICY "Users can view comments on tasks in their projects"
  ON task_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM site_diary_tasks sdt
      JOIN project_members pm ON pm.project_id = sdt.project_id
      WHERE sdt.id = task_comments.task_id
      AND pm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create comments on tasks in their projects"
  ON task_comments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM site_diary_tasks sdt
      JOIN project_members pm ON pm.project_id = sdt.project_id
      WHERE sdt.id = task_comments.task_id
      AND pm.user_id = auth.uid()
    )
    AND user_id = auth.uid()
  );

-- RLS Policies for user_reminders
CREATE POLICY "Users can view their own reminders"
  ON user_reminders FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create reminders for project members"
  ON user_reminders FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = user_reminders.project_id
      AND project_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own reminders"
  ON user_reminders FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own reminders"
  ON user_reminders FOR DELETE
  USING (user_id = auth.uid());

-- Trigger to update updated_at on tasks
CREATE TRIGGER update_site_diary_tasks_updated_at
  BEFORE UPDATE ON site_diary_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();