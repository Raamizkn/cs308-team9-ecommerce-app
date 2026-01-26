-- Create chat_conversations table to track conversation claims
-- This table tracks which support agent has claimed which customer conversation

CREATE TABLE IF NOT EXISTS public.chat_conversations (
  user_id TEXT PRIMARY KEY, -- Customer user_id (UUID or guest_*)
  claimed_by UUID REFERENCES public.support_agents(uid) ON DELETE SET NULL,
  claimed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_chat_conversations_claimed_by ON public.chat_conversations(claimed_by);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_claimed_at ON public.chat_conversations(claimed_at);

-- Function to automatically create conversation entry when first message is sent
CREATE OR REPLACE FUNCTION public.create_chat_conversation_on_message()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert or update conversation entry
  INSERT INTO public.chat_conversations (user_id, created_at, updated_at)
  VALUES (NEW.user_id, NOW(), NOW())
  ON CONFLICT (user_id) DO UPDATE
  SET updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create conversation when first message is sent
DROP TRIGGER IF EXISTS trigger_create_conversation_on_message ON public.chat_messages;
CREATE TRIGGER trigger_create_conversation_on_message
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.create_chat_conversation_on_message();

-- RLS Policies for chat_conversations
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;

-- Support agents can view all conversations
CREATE POLICY "Support agents can view all conversations"
  ON public.chat_conversations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.support_agents
      WHERE uid = auth.uid()
    )
  );

-- Support agents can insert new conversations (for manual creation if needed)
CREATE POLICY "Support agents can insert conversations"
  ON public.chat_conversations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.support_agents
      WHERE uid = auth.uid()
    )
  );

-- Support agents can claim conversations
CREATE POLICY "Support agents can claim conversations"
  ON public.chat_conversations
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.support_agents
      WHERE uid = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.support_agents
      WHERE uid = auth.uid()
    )
  );

-- Users can view their own conversation status (read-only)
CREATE POLICY "Users can view their own conversation"
  ON public.chat_conversations
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()::TEXT
    OR user_id LIKE 'guest_%'
  );

