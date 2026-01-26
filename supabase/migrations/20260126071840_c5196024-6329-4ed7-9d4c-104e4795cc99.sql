-- Create starred_messages table for bookmarks
CREATE TABLE public.starred_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  starred_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id)
);

-- Enable RLS on starred_messages
ALTER TABLE public.starred_messages ENABLE ROW LEVEL SECURITY;

-- RLS policies for starred_messages
CREATE POLICY "Users can view their own starred messages"
  ON public.starred_messages FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can star messages"
  ON public.starred_messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unstar messages"
  ON public.starred_messages FOR DELETE
  USING (auth.uid() = user_id);

-- Create muted_conversations table
CREATE TABLE public.muted_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  muted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  mute_until TIMESTAMP WITH TIME ZONE, -- NULL means muted indefinitely
  UNIQUE(conversation_id, user_id)
);

-- Enable RLS on muted_conversations
ALTER TABLE public.muted_conversations ENABLE ROW LEVEL SECURITY;

-- RLS policies for muted_conversations
CREATE POLICY "Users can view their muted conversations"
  ON public.muted_conversations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can mute conversations"
  ON public.muted_conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unmute conversations"
  ON public.muted_conversations FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their mute settings"
  ON public.muted_conversations FOR UPDATE
  USING (auth.uid() = user_id);

-- Add content_type column to messages for rich text
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS content_type TEXT DEFAULT 'plain';

-- Add link_preview column to messages for cached link previews
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS link_preview JSONB;

-- Enable realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.starred_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.muted_conversations;