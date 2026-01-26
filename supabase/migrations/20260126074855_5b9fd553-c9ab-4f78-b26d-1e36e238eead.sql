-- Conversation labels/tags
CREATE TABLE public.conversation_labels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#6366f1',
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.conversation_label_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  label_id UUID NOT NULL REFERENCES public.conversation_labels(id) ON DELETE CASCADE,
  assigned_by UUID NOT NULL,
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(conversation_id, label_id)
);

-- Message reminders
CREATE TABLE public.message_reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  remind_at TIMESTAMP WITH TIME ZONE NOT NULL,
  note TEXT,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Typing indicators table for real-time
CREATE TABLE public.typing_indicators (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(conversation_id, user_id)
);

-- Enable RLS
ALTER TABLE public.conversation_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_label_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.typing_indicators ENABLE ROW LEVEL SECURITY;

-- RLS Policies for conversation_labels
CREATE POLICY "Users can view all labels" ON public.conversation_labels FOR SELECT USING (true);
CREATE POLICY "Users can create labels" ON public.conversation_labels FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users can update own labels" ON public.conversation_labels FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "Users can delete own labels" ON public.conversation_labels FOR DELETE USING (auth.uid() = created_by);

-- RLS Policies for conversation_label_assignments
CREATE POLICY "Users can view label assignments" ON public.conversation_label_assignments FOR SELECT USING (true);
CREATE POLICY "Users can assign labels" ON public.conversation_label_assignments FOR INSERT WITH CHECK (auth.uid() = assigned_by);
CREATE POLICY "Users can remove label assignments" ON public.conversation_label_assignments FOR DELETE USING (auth.uid() = assigned_by);

-- RLS Policies for message_reminders
CREATE POLICY "Users can view own reminders" ON public.message_reminders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create reminders" ON public.message_reminders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own reminders" ON public.message_reminders FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own reminders" ON public.message_reminders FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for typing_indicators
CREATE POLICY "Users can view typing indicators" ON public.typing_indicators FOR SELECT USING (true);
CREATE POLICY "Users can insert own typing" ON public.typing_indicators FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own typing" ON public.typing_indicators FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own typing" ON public.typing_indicators FOR DELETE USING (auth.uid() = user_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.typing_indicators;
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reminders;