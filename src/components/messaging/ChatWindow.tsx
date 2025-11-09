import { useMessages } from "@/hooks/useMessages";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MessageComposer } from "./MessageComposer";
import { MessageBubble } from "./MessageBubble";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";

interface ChatWindowProps {
  conversationId: string;
}

export function ChatWindow({ conversationId }: ChatWindowProps) {
  const { messages, isLoading, sendMessage, markAsRead } = useMessages(conversationId);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { refetch: refetchUnread } = useUnreadMessages();
  const previousMessageCountRef = useRef<number>(0);

  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Mark messages as read and show toast for new messages
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

    // Mark unread messages as read
    unreadMessages.forEach((msg) => {
      markAsRead(msg.id);
    });

    if (unreadMessages.length > 0) {
      setTimeout(() => refetchUnread(), 500);
    }
  }, [messages, currentUser, markAsRead, refetchUnread]);

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
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {messages?.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              isOwn={message.sender_id === currentUser?.id}
            />
          ))}
        </div>
      </ScrollArea>

      <div className="border-t p-4">
        <MessageComposer
          conversationId={conversationId}
          onSend={(content, mentions, attachments) => {
            sendMessage({
              conversation_id: conversationId,
              content,
              mentions,
              attachments,
            });
          }}
        />
      </div>
    </div>
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
