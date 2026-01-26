-- ============================================
-- MESSAGE REACTIONS
-- ============================================
CREATE TABLE public.message_reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  emoji TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id, emoji)
);

-- Enable RLS
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_full_access" ON public.message_reactions FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================
-- READ RECEIPTS
-- ============================================
CREATE TABLE public.message_read_receipts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  read_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id)
);

-- Enable RLS
ALTER TABLE public.message_read_receipts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_full_access" ON public.message_read_receipts FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================
-- PINNED MESSAGES
-- ============================================
CREATE TABLE public.pinned_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  pinned_by UUID NOT NULL,
  pinned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(message_id)
);

-- Enable RLS
ALTER TABLE public.pinned_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_full_access" ON public.pinned_messages FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================
-- THREAD REPLIES (add parent_message_id to messages)
-- ============================================
ALTER TABLE public.messages ADD COLUMN parent_message_id UUID REFERENCES public.messages(id) ON DELETE SET NULL;
ALTER TABLE public.messages ADD COLUMN reply_count INTEGER DEFAULT 0;
ALTER TABLE public.messages ADD COLUMN is_edited BOOLEAN DEFAULT false;
ALTER TABLE public.messages ADD COLUMN edited_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.messages ADD COLUMN is_deleted BOOLEAN DEFAULT false;
ALTER TABLE public.messages ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;

-- Create index for faster thread queries
CREATE INDEX idx_messages_parent_id ON public.messages(parent_message_id) WHERE parent_message_id IS NOT NULL;

-- Create function to update reply count
CREATE OR REPLACE FUNCTION public.update_message_reply_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.parent_message_id IS NOT NULL THEN
    UPDATE public.messages 
    SET reply_count = reply_count + 1 
    WHERE id = NEW.parent_message_id;
  ELSIF TG_OP = 'DELETE' AND OLD.parent_message_id IS NOT NULL THEN
    UPDATE public.messages 
    SET reply_count = GREATEST(0, reply_count - 1)
    WHERE id = OLD.parent_message_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for reply count
CREATE TRIGGER update_reply_count_trigger
AFTER INSERT OR DELETE ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.update_message_reply_count();

-- Enable realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_read_receipts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pinned_messages;