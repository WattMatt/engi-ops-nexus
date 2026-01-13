-- Drop existing conversation policies (may have partial state)
DROP POLICY IF EXISTS "Users can view accessible conversations" ON conversations;
DROP POLICY IF EXISTS "Users can create conversations" ON conversations;
DROP POLICY IF EXISTS "Participants can view conversations" ON conversations;

-- Drop existing message policies
DROP POLICY IF EXISTS "Users can view messages in accessible conversations" ON messages;
DROP POLICY IF EXISTS "Users can send messages in accessible conversations" ON messages;
DROP POLICY IF EXISTS "Participants can view messages" ON messages;
DROP POLICY IF EXISTS "Participants can send messages" ON messages;

-- Conversations: Users can view conversations where:
-- 1. They are a participant (direct/group messages)
-- 2. They have access to the linked project (project threads)
-- 3. They are an admin
CREATE POLICY "Users can view accessible conversations"
ON conversations FOR SELECT
USING (
  auth.uid() = created_by
  OR participants ? (auth.uid()::text)
  OR (project_id IS NOT NULL AND has_project_access(auth.uid(), project_id))
  OR has_role(auth.uid(), 'admin')
);

-- Conversations: Users can create conversations
CREATE POLICY "Users can create conversations"
ON conversations FOR INSERT
WITH CHECK (
  auth.uid() = created_by
  AND (
    project_id IS NULL
    OR has_project_access(auth.uid(), project_id)
  )
);

-- Messages: Users can view messages in accessible conversations
CREATE POLICY "Users can view messages in accessible conversations"
ON messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = conversation_id
    AND (
      c.created_by = auth.uid()
      OR c.participants ? (auth.uid()::text)
      OR (c.project_id IS NOT NULL AND has_project_access(auth.uid(), c.project_id))
    )
  )
  OR has_role(auth.uid(), 'admin')
);

-- Messages: Users can send messages in accessible conversations
CREATE POLICY "Users can send messages in accessible conversations"
ON messages FOR INSERT
WITH CHECK (
  sender_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = conversation_id
    AND (
      c.created_by = auth.uid()
      OR c.participants ? (auth.uid()::text)
      OR (c.project_id IS NOT NULL AND has_project_access(auth.uid(), c.project_id))
    )
  )
);