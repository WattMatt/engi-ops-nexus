import { useState } from "react";
import { Message } from "@/hooks/useMessages";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { MessageSquare, Pin, Forward } from "lucide-react";
import { MessageReactions } from "./MessageReactions";
import { MessageActions } from "./MessageActions";
import { ReadReceipts } from "./ReadReceipts";
import { EditMessageDialog } from "./EditMessageDialog";
import { ForwardMessageDialog } from "./ForwardMessageDialog";
import { VoiceMessagePlayer } from "./VoiceRecorder";
import { LinkPreviews } from "./LinkPreview";
import { FilePreviewList } from "./FilePreview";
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
  const [isForwarding, setIsForwarding] = useState(false);
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

  // Type assertions for extended message properties
  const extendedMessage = message as any;
  const isForwarded = !!extendedMessage.forwarded_from_message_id;
  const hasVoice = !!extendedMessage.voice_message_url;

  // Handle deleted messages
  if (extendedMessage.is_deleted) {
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
            {extendedMessage.is_edited && (
              <span className="text-xs text-muted-foreground">(edited)</span>
            )}
            {isPinned && (
              <Pin className="h-3 w-3 text-primary" />
            )}
          </div>

          {/* Forwarded indicator */}
          {isForwarded && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Forward className="h-3 w-3" />
              <span>Forwarded message</span>
            </div>
          )}

          <div className="flex items-start gap-2">
            <div
              className={cn(
                "rounded-lg p-3",
                isOwn
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted"
              )}
            >
              {/* Voice message */}
              {hasVoice ? (
                <VoiceMessagePlayer
                  url={extendedMessage.voice_message_url}
                  duration={extendedMessage.voice_duration_seconds || 0}
                />
              ) : (
                <>
                  {/* Rich text or plain text content */}
                  {extendedMessage.content_type === "rich" ? (
                    <div 
                      className="text-sm prose prose-sm max-w-none dark:prose-invert"
                      dangerouslySetInnerHTML={{ __html: message.content }}
                    />
                  ) : (
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  )}
                  
                  {/* Link previews */}
                  {extendedMessage.content_type !== "rich" && (
                    <LinkPreviews text={message.content} />
                  )}
                </>
              )}

              {/* File/image previews */}
              {message.attachments && message.attachments.length > 0 && (
                <FilePreviewList 
                  attachments={message.attachments.map((att: any) => ({
                    name: att.name,
                    type: att.type || "application/octet-stream",
                    size: att.size || 0,
                    url: att.url || `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/message-attachments/${att.path}`,
                  }))}
                />
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
                onForward={() => setIsForwarding(true)}
              />
            )}
          </div>

          {/* Reactions */}
          <MessageReactions messageId={message.id} currentUserId={currentUser?.id} />

          {/* Reply count */}
          {extendedMessage.reply_count > 0 && onReply && (
            <button
              onClick={onReply}
              className="flex items-center gap-1 text-xs text-primary hover:underline mt-1"
            >
              <MessageSquare className="h-3 w-3" />
              {extendedMessage.reply_count} {extendedMessage.reply_count === 1 ? "reply" : "replies"}
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

      <ForwardMessageDialog
        open={isForwarding}
        onOpenChange={setIsForwarding}
        messageId={message.id}
        messageContent={message.content}
        originalConversationId={message.conversation_id}
      />
    </>
  );
}
