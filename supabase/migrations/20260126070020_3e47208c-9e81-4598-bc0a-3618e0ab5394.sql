-- ============================================
-- SCHEDULED MESSAGES
-- ============================================
CREATE TABLE public.scheduled_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  content TEXT NOT NULL,
  mentions TEXT[] DEFAULT '{}',
  attachments JSONB DEFAULT '[]',
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'cancelled')),
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.scheduled_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_full_access" ON public.scheduled_messages FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================
-- REACTION NOTIFICATIONS (extend message_notifications)
-- ============================================
ALTER TABLE public.message_notifications ADD COLUMN IF NOT EXISTS reaction_emoji TEXT;
ALTER TABLE public.message_notifications ADD COLUMN IF NOT EXISTS reactor_id UUID;

-- ============================================
-- VOICE MESSAGE SUPPORT (add to messages)
-- ============================================
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS voice_message_url TEXT;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS voice_duration_seconds INTEGER;

-- ============================================
-- MESSAGE FORWARDING TRACKING
-- ============================================
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS forwarded_from_message_id UUID REFERENCES public.messages(id) ON DELETE SET NULL;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS forwarded_from_conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL;

-- Enable realtime for scheduled messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.scheduled_messages;