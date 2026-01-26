
-- Message templates table
CREATE TABLE public.message_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  shortcut TEXT,
  category TEXT DEFAULT 'general',
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Archived conversations table
CREATE TABLE public.archived_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  archived_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(conversation_id, user_id)
);

-- Add delivery status to messages
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS delivery_status TEXT DEFAULT 'sent' CHECK (delivery_status IN ('sending', 'sent', 'delivered', 'read', 'failed'));

-- Enable RLS
ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.archived_conversations ENABLE ROW LEVEL SECURITY;

-- RLS policies for message_templates
CREATE POLICY "Users can manage their own templates"
ON public.message_templates FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- RLS policies for archived_conversations
CREATE POLICY "Users can manage their own archives"
ON public.archived_conversations FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_templates;
ALTER PUBLICATION supabase_realtime ADD TABLE public.archived_conversations;
