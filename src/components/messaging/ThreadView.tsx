import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X, MessageSquare } from "lucide-react";
import { MessageBubble } from "./MessageBubble";
import { MessageComposer } from "./MessageComposer";
import { Message } from "@/hooks/useMessages";
import { formatDistanceToNow } from "date-fns";

interface ThreadViewProps {
  parentMessage: Message;
  conversationId: string;
  currentUserId?: string;
  onClose: () => void;
}

export function ThreadView({
  parentMessage,
  conversationId,
  currentUserId,
  onClose,
}: ThreadViewProps) {
  const queryClient = useQueryClient();

  const { data: replies = [], isLoading } = useQuery({
    queryKey: ["thread-replies", parentMessage.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("parent_message_id", parentMessage.id)
        .or("is_deleted.is.null,is_deleted.eq.false")
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data as Message[];
    },
  });

  const sendReply = useMutation({
    mutationFn: async ({
      content,
      mentions,
      attachments,
    }: {
      content: string;
      mentions?: string[];
      attachments?: any[];
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("messages").insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content,
        parent_message_id: parentMessage.id,
        mentions: mentions || [],
        attachments: attachments || [],
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["thread-replies", parentMessage.id] });
      queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
    },
  });

  const { data: parentSender } = useQuery({
    queryKey: ["user", parentMessage.sender_id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", parentMessage.sender_id)
        .single();
      return data;
    },
  });

  return (
    <div className="flex flex-col h-full border-l bg-background">
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          <span className="font-semibold">Thread</span>
          <span className="text-sm text-muted-foreground">
            {replies.length} {replies.length === 1 ? "reply" : "replies"}
          </span>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {/* Parent message */}
          <div className="pb-4 border-b">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-medium">
                {parentSender?.full_name || parentSender?.email || "Unknown"}
              </span>
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(parentMessage.created_at), {
                  addSuffix: true,
                })}
              </span>
            </div>
            <p className="text-sm whitespace-pre-wrap">{parentMessage.content}</p>
          </div>

          {/* Replies */}
          {isLoading ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Loading replies...
            </p>
          ) : replies.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No replies yet. Start the conversation!
            </p>
          ) : (
            replies.map((reply) => (
              <MessageBubble
                key={reply.id}
                message={reply}
                isOwn={reply.sender_id === currentUserId}
              />
            ))
          )}
        </div>
      </ScrollArea>

      <div className="border-t p-4">
        <MessageComposer
          conversationId={conversationId}
          onSend={(content, mentions, attachments) => {
            sendReply.mutate({ content, mentions, attachments });
          }}
        />
      </div>
    </div>
  );
}
