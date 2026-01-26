import { useState } from "react";
import { Message } from "@/hooks/useMessages";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { Paperclip, MessageSquare, Pin } from "lucide-react";
import { MessageReactions } from "./MessageReactions";
import { MessageActions } from "./MessageActions";
import { ReadReceipts } from "./ReadReceipts";
import { EditMessageDialog } from "./EditMessageDialog";
import { toast } from "sonner";

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  conversationParticipants?: string[];
  isPinned?: boolean;
  onReply?: () => void;
  onPin?: () => void;
  highlightId?: string;
}

export function MessageBubble({ 
  message, 
  isOwn, 
  conversationParticipants = [],
  isPinned = false,
  onReply,
  onPin,
  highlightId,
}: MessageBubbleProps) {
  const [isEditing, setIsEditing] = useState(false);
  const queryClient = useQueryClient();

  const { data: sender } = useQuery({
    queryKey: ["user", message.sender_id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", message.sender_id)
        .single();
      return data;
    },
  });

  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  const editMessage = useMutation({
    mutationFn: async (newContent: string) => {
      const { error } = await supabase
        .from("messages")
        .update({
          content: newContent,
          is_edited: true,
          edited_at: new Date().toISOString(),
        })
        .eq("id", message.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages", message.conversation_id] });
      toast.success("Message updated");
    },
    onError: (error: Error) => {
      toast.error(`Failed to edit message: ${error.message}`);
    },
  });

  const deleteMessage = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("messages")
        .update({
          is_deleted: true,
          deleted_at: new Date().toISOString(),
        })
        .eq("id", message.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages", message.conversation_id] });
      toast.success("Message deleted");
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete message: ${error.message}`);
    },
  });

  const senderName = sender?.full_name || sender?.email || "Unknown";
  const initials = senderName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  // Handle deleted messages
  if ((message as any).is_deleted) {
    return (
      <div className={cn("flex gap-3", isOwn && "flex-row-reverse")}>
        <Avatar className="h-8 w-8">
          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
        </Avatar>
        <div className={cn("flex flex-col gap-1 max-w-[70%]", isOwn && "items-end")}>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{senderName}</span>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
            </span>
          </div>
          <div className="rounded-lg p-3 bg-muted/50 border border-dashed">
            <p className="text-sm text-muted-foreground italic">This message was deleted</p>
          </div>
        </div>
      </div>
    );
  }

  const isHighlighted = highlightId === message.id;

  return (
    <>
      <div 
        id={`message-${message.id}`}
        className={cn(
          "flex gap-3 group transition-colors",
          isOwn && "flex-row-reverse",
          isHighlighted && "bg-primary/10 -mx-2 px-2 py-1 rounded-lg"
        )}
      >
        <Avatar className="h-8 w-8">
          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
        </Avatar>

        <div className={cn("flex flex-col gap-1 max-w-[70%]", isOwn && "items-end")}>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{senderName}</span>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
            </span>
            {(message as any).is_edited && (
              <span className="text-xs text-muted-foreground">(edited)</span>
            )}
            {isPinned && (
              <Pin className="h-3 w-3 text-primary" />
            )}
          </div>

          <div className="flex items-start gap-2">
            <div
              className={cn(
                "rounded-lg p-3",
                isOwn
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted"
              )}
            >
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>

              {message.attachments && message.attachments.length > 0 && (
                <div className="mt-2 space-y-1">
                  {message.attachments.map((attachment: any, i: number) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 text-xs opacity-80"
                    >
                      <Paperclip className="h-3 w-3" />
                      <span>{attachment.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {onReply && onPin && (
              <MessageActions
                messageId={message.id}
                isOwn={isOwn}
                isPinned={isPinned}
                onEdit={() => setIsEditing(true)}
                onDelete={() => deleteMessage.mutate()}
                onPin={onPin}
                onReply={onReply}
              />
            )}
          </div>

          {/* Reactions */}
          <MessageReactions messageId={message.id} currentUserId={currentUser?.id} />

          {/* Reply count */}
          {(message as any).reply_count > 0 && onReply && (
            <button
              onClick={onReply}
              className="flex items-center gap-1 text-xs text-primary hover:underline mt-1"
            >
              <MessageSquare className="h-3 w-3" />
              {(message as any).reply_count} {(message as any).reply_count === 1 ? "reply" : "replies"}
            </button>
          )}

          {/* Read receipts for own messages */}
          {isOwn && conversationParticipants.length > 0 && (
            <ReadReceipts
              messageId={message.id}
              conversationParticipants={conversationParticipants}
              senderId={message.sender_id}
            />
          )}
        </div>
      </div>

      <EditMessageDialog
        open={isEditing}
        onOpenChange={setIsEditing}
        initialContent={message.content}
        onSave={(content) => editMessage.mutate(content)}
      />
    </>
  );
}
