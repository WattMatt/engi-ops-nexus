-- Add 'client' role to app_role enum
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'client';

-- Create conversations table
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('direct', 'group', 'project_thread')),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT,
  participants JSONB NOT NULL DEFAULT '[]'::jsonb,
  last_message_at TIMESTAMP WITH TIME ZONE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create messages table
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  mentions JSONB DEFAULT '[]'::jsonb,
  attachments JSONB DEFAULT '[]'::jsonb,
  is_read BOOLEAN DEFAULT false,
  read_by JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create message_notifications table
CREATE TABLE IF NOT EXISTS public.message_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('mention', 'new_message', 'reply')),
  is_read BOOLEAN DEFAULT false,
  email_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create inspection_comments table
CREATE TABLE IF NOT EXISTS public.inspection_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID,
  subsection_id UUID,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  mentions JSONB DEFAULT '[]'::jsonb,
  parent_comment_id UUID REFERENCES public.inspection_comments(id) ON DELETE CASCADE,
  attachments JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create task_assignments table
CREATE TABLE IF NOT EXISTS public.task_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID,
  assigned_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_to UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contractor_company TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'in_progress', 'completed', 'rejected')),
  due_date DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create approval_workflows table
CREATE TABLE IF NOT EXISTS public.approval_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_type TEXT NOT NULL CHECK (document_type IN ('coc', 'cost_report', 'budget', 'specification')),
  document_id UUID NOT NULL,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  submitted_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  approver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'requires_changes')),
  comments TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create client_requests table
CREATE TABLE IF NOT EXISTS public.client_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  client_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  request_type TEXT NOT NULL CHECK (request_type IN ('inspection', 'question', 'general')),
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  attachments JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE
);

-- Create shared_notes table
CREATE TABLE IF NOT EXISTS public.shared_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subsection_id UUID,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_pinned BOOLEAN DEFAULT false,
  tags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create status_notifications table
CREATE TABLE IF NOT EXISTS public.status_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL CHECK (notification_type IN ('status_update', 'approval_request', 'task_assigned', 'mention', 'client_request')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  link TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  is_read BOOLEAN DEFAULT false,
  email_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_conversations_project ON public.conversations(project_id);
CREATE INDEX IF NOT EXISTS idx_message_notifications_user ON public.message_notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_status_notifications_user ON public.status_notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_client_requests_project ON public.client_requests(project_id, status);
CREATE INDEX IF NOT EXISTS idx_approval_workflows_project ON public.approval_workflows(project_id, status);

-- Enable RLS on all tables
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspection_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.status_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for conversations
CREATE POLICY "Users can view conversations they participate in"
  ON public.conversations FOR SELECT
  USING (
    auth.uid() = created_by OR
    auth.uid()::text = ANY(SELECT jsonb_array_elements_text(participants))
  );

CREATE POLICY "Users can create conversations"
  ON public.conversations FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their conversations"
  ON public.conversations FOR UPDATE
  USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their conversations"
  ON public.conversations FOR DELETE
  USING (auth.uid() = created_by);

-- RLS Policies for messages
CREATE POLICY "Users can view messages in their conversations"
  ON public.messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations
      WHERE conversations.id = messages.conversation_id
      AND (
        auth.uid() = conversations.created_by OR
        auth.uid()::text = ANY(SELECT jsonb_array_elements_text(conversations.participants))
      )
    )
  );

CREATE POLICY "Users can send messages to their conversations"
  ON public.messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM public.conversations
      WHERE conversations.id = messages.conversation_id
      AND (
        auth.uid() = conversations.created_by OR
        auth.uid()::text = ANY(SELECT jsonb_array_elements_text(conversations.participants))
      )
    )
  );

CREATE POLICY "Users can update their own messages"
  ON public.messages FOR UPDATE
  USING (auth.uid() = sender_id);

CREATE POLICY "Users can delete their own messages"
  ON public.messages FOR DELETE
  USING (auth.uid() = sender_id);

-- RLS Policies for message_notifications
CREATE POLICY "Users can view their own notifications"
  ON public.message_notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications"
  ON public.message_notifications FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update their own notifications"
  ON public.message_notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for inspection_comments
CREATE POLICY "Users can view comments on their projects"
  ON public.inspection_comments FOR SELECT
  USING (true);

CREATE POLICY "Users can create comments"
  ON public.inspection_comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own comments"
  ON public.inspection_comments FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments"
  ON public.inspection_comments FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for task_assignments
CREATE POLICY "Users can view their task assignments"
  ON public.task_assignments FOR SELECT
  USING (auth.uid() = assigned_to OR auth.uid() = assigned_by OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can create task assignments"
  ON public.task_assignments FOR INSERT
  WITH CHECK (auth.uid() = assigned_by);

CREATE POLICY "Users can update task assignments"
  ON public.task_assignments FOR UPDATE
  USING (auth.uid() = assigned_to OR auth.uid() = assigned_by OR has_role(auth.uid(), 'admin'));

-- RLS Policies for approval_workflows
CREATE POLICY "Users can view approval workflows for their projects"
  ON public.approval_workflows FOR SELECT
  USING (
    auth.uid() = submitted_by OR
    auth.uid() = approver_id OR
    has_role(auth.uid(), 'admin') OR
    EXISTS (
      SELECT 1 FROM public.project_members
      WHERE project_members.project_id = approval_workflows.project_id
      AND project_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create approval workflows"
  ON public.approval_workflows FOR INSERT
  WITH CHECK (auth.uid() = submitted_by);

CREATE POLICY "Approvers can update approval workflows"
  ON public.approval_workflows FOR UPDATE
  USING (auth.uid() = approver_id OR has_role(auth.uid(), 'admin'));

-- RLS Policies for client_requests
CREATE POLICY "Users can view client requests for their projects"
  ON public.client_requests FOR SELECT
  USING (
    auth.uid() = client_user_id OR
    auth.uid() = assigned_to OR
    has_role(auth.uid(), 'admin') OR
    EXISTS (
      SELECT 1 FROM public.project_members
      WHERE project_members.project_id = client_requests.project_id
      AND project_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Clients can create their own requests"
  ON public.client_requests FOR INSERT
  WITH CHECK (auth.uid() = client_user_id);

CREATE POLICY "Users can update client requests"
  ON public.client_requests FOR UPDATE
  USING (
    auth.uid() = assigned_to OR
    has_role(auth.uid(), 'admin')
  );

-- RLS Policies for shared_notes
CREATE POLICY "Users can view shared notes for their projects"
  ON public.shared_notes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.project_members
      WHERE project_members.project_id = shared_notes.project_id
      AND project_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create shared notes"
  ON public.shared_notes FOR INSERT
  WITH CHECK (
    auth.uid() = created_by AND
    EXISTS (
      SELECT 1 FROM public.project_members
      WHERE project_members.project_id = shared_notes.project_id
      AND project_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own shared notes"
  ON public.shared_notes FOR UPDATE
  USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own shared notes"
  ON public.shared_notes FOR DELETE
  USING (auth.uid() = created_by OR has_role(auth.uid(), 'admin'));

-- RLS Policies for status_notifications
CREATE POLICY "Users can view their own status notifications"
  ON public.status_notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can create status notifications"
  ON public.status_notifications FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update their own status notifications"
  ON public.status_notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- Enable realtime for relevant tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.status_notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.client_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;

-- Create storage bucket for message attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('message-attachments', 'message-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for message-attachments
CREATE POLICY "Users can upload their own message attachments"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'message-attachments' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view message attachments they have access to"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'message-attachments');

CREATE POLICY "Users can delete their own message attachments"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'message-attachments' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Triggers for updated_at
CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_messages_updated_at
  BEFORE UPDATE ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_inspection_comments_updated_at
  BEFORE UPDATE ON public.inspection_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_task_assignments_updated_at
  BEFORE UPDATE ON public.task_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_approval_workflows_updated_at
  BEFORE UPDATE ON public.approval_workflows
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_client_requests_updated_at
  BEFORE UPDATE ON public.client_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_shared_notes_updated_at
  BEFORE UPDATE ON public.shared_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();