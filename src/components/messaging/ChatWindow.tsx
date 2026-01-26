import { useState, useEffect, useRef } from "react";
import { useMessages, Message } from "@/hooks/useMessages";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MessageComposer } from "./MessageComposer";
import { MessageBubble } from "./MessageBubble";
import { MessageSearch } from "./MessageSearch";
import { PinnedMessages, usePinMessage } from "./PinnedMessages";
import { StarredMessages } from "./StarredMessages";
import { MuteConversation } from "./MuteConversation";
import { ScheduledMessagesList } from "./ScheduledMessagesList";
import { ThreadView } from "./ThreadView";
import { TypingIndicator } from "./TypingIndicator";
import { ConversationArchive } from "./ConversationArchive";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { toast } from "sonner";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";
import { useTypingIndicator } from "@/hooks/useTypingIndicator";
import { cn } from "@/lib/utils";

interface ChatWindowProps {
  conversationId: string;
}

export function ChatWindow({ conversationId }: ChatWindowProps) {
  const { messages, isLoading, sendMessage, markAsRead } = useMessages(conversationId);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { refetch: refetchUnread } = useUnreadMessages();
  const previousMessageCountRef = useRef<number>(0);
  const { typingUsers } = useTypingIndicator(conversationId);
  const queryClient = useQueryClient();

  const [showSearch, setShowSearch] = useState(false);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const [threadMessage, setThreadMessage] = useState<Message | null>(null);

  const pinMessage = usePinMessage();

  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  const { data: conversation } = useQuery({
    queryKey: ["conversation", conversationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("conversations")
        .select("participants")
        .eq("id", conversationId)
        .single();

      if (error) throw error;
      return data;
    },
  });

  const { data: pinnedMessageIds = [] } = useQuery({
    queryKey: ["pinned-message-ids", conversationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pinned_messages")
        .select("message_id")
        .eq("conversation_id", conversationId);

      if (error) throw error;
      return data.map((p) => p.message_id);
    },
  });

  // Create read receipt when viewing messages
  const createReadReceipt = useMutation({
    mutationFn: async (messageId: string) => {
      if (!currentUser) return;

      await supabase.from("message_read_receipts").upsert(
        {
          message_id: messageId,
          user_id: currentUser.id,
        },
        { onConflict: "message_id,user_id" }
      );
    },
  });

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current && !highlightedMessageId) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, highlightedMessageId]);

  // Mark messages as read and create read receipts
  useEffect(() => {
    if (!messages || !currentUser) return;

    const unreadMessages = messages.filter(
      (msg) => !msg.is_read && msg.sender_id !== currentUser.id
    );

    // Show toast for new messages
    if (messages.length > previousMessageCountRef.current && previousMessageCountRef.current > 0) {
      const newMessages = messages.slice(previousMessageCountRef.current);
      const newIncomingMessages = newMessages.filter((msg) => msg.sender_id !== currentUser.id);
      
      if (newIncomingMessages.length > 0) {
        toast.info("New message received", {
          description: newIncomingMessages[0].content.substring(0, 50) + (newIncomingMessages[0].content.length > 50 ? "..." : ""),
        });
      }
    }

    previousMessageCountRef.current = messages.length;

    // Mark unread messages as read and create read receipts
    unreadMessages.forEach((msg) => {
      markAsRead(msg.id);
      createReadReceipt.mutate(msg.id);
    });

    // Also create read receipts for already-read messages we haven't recorded
    messages
      .filter((msg) => msg.sender_id !== currentUser.id)
      .forEach((msg) => {
        createReadReceipt.mutate(msg.id);
      });

    if (unreadMessages.length > 0) {
      setTimeout(() => refetchUnread(), 500);
    }
  }, [messages, currentUser, markAsRead, refetchUnread]);

  const handleMessageSelect = (messageId: string) => {
    setHighlightedMessageId(messageId);
    setShowSearch(false);

    // Scroll to message
    setTimeout(() => {
      const element = document.getElementById(`message-${messageId}`);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
      }

      // Clear highlight after 2 seconds
      setTimeout(() => setHighlightedMessageId(null), 2000);
    }, 100);
  };

  const handlePinMessage = (messageId: string) => {
    pinMessage.mutate(
      { messageId, conversationId },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["pinned-message-ids", conversationId] });
        },
      }
    );
  };

  // Filter out deleted messages and thread replies for main view
  const mainMessages = messages?.filter(
    (msg) => !(msg as any).is_deleted && !(msg as any).parent_message_id
  );

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 p-4 space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className={cn("flex", i % 2 === 0 ? "justify-start" : "justify-end")}>
              <Skeleton className="h-16 w-3/4" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      <div className="flex flex-col flex-1">
        {/* Header with search, mute, and archive buttons */}
        <div className="flex items-center justify-end gap-2 p-2 border-b">
          <ConversationArchive conversationId={conversationId} />
          <MuteConversation conversationId={conversationId} />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSearch(!showSearch)}
          >
            <Search className="h-4 w-4 mr-2" />
            Search
          </Button>
        </div>

        {/* Search bar */}
        {showSearch && (
          <MessageSearch
            conversationId={conversationId}
            onMessageSelect={handleMessageSelect}
            onClose={() => setShowSearch(false)}
          />
        )}

        {/* Scheduled messages */}
        <ScheduledMessagesList conversationId={conversationId} />

        {/* Pinned messages */}
        <PinnedMessages
          conversationId={conversationId}
          onMessageSelect={handleMessageSelect}
        />

        {/* Starred messages */}
        <div className="px-2">
          <StarredMessages
            conversationId={conversationId}
            onNavigateToMessage={handleMessageSelect}
          />
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          <div className="space-y-4">
            {mainMessages?.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                isOwn={message.sender_id === currentUser?.id}
                conversationParticipants={Array.isArray(conversation?.participants) ? conversation.participants as string[] : []}
                isPinned={pinnedMessageIds.includes(message.id)}
                highlightId={highlightedMessageId || undefined}
                onReply={() => setThreadMessage(message)}
                onPin={() => handlePinMessage(message.id)}
              />
            ))}
          </div>
        </ScrollArea>

        <TypingIndicator typingUsers={typingUsers} />

        <div className="border-t p-4">
          <MessageComposer
            conversationId={conversationId}
            onSend={(content, mentions, attachments, voiceUrl, voiceDuration, contentType) => {
              sendMessage({
                conversation_id: conversationId,
                content,
                mentions,
                attachments,
                voice_message_url: voiceUrl,
                voice_duration_seconds: voiceDuration,
                content_type: contentType,
              });
            }}
          />
        </div>
      </div>

      {/* Thread panel */}
      {threadMessage && (
        <div className="w-96">
          <ThreadView
            parentMessage={threadMessage}
            conversationId={conversationId}
            currentUserId={currentUser?.id}
            onClose={() => setThreadMessage(null)}
          />
        </div>
      )}
    </div>
  );
}

