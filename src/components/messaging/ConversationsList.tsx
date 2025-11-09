import { Conversation } from "@/hooks/useConversations";
import { cn } from "@/lib/utils";
import { MessageSquare, Users, FolderKanban, Paperclip } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";

interface ConversationsListProps {
  conversations: Conversation[];
  selectedId?: string;
  onSelect: (id: string) => void;
  isLoading: boolean;
}

export function ConversationsList({
  conversations,
  selectedId,
  onSelect,
  isLoading,
}: ConversationsListProps) {
  const { unreadByConversation } = useUnreadMessages();

  const getIcon = (type: Conversation["type"]) => {
    switch (type) {
      case "direct":
        return <MessageSquare className="h-4 w-4" />;
      case "group":
        return <Users className="h-4 w-4" />;
      case "project_thread":
        return <FolderKanban className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-16 w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (!conversations.length) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No conversations yet</p>
        <p className="text-sm">Start a new conversation to get started</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-2">
        {conversations.map((conversation) => (
          <button
            key={conversation.id}
            onClick={() => onSelect(conversation.id)}
            className={cn(
              "w-full text-left p-3 rounded-lg transition-colors hover:bg-accent",
              selectedId === conversation.id && "bg-accent"
            )}
          >
            <div className="flex items-start gap-3">
              <div className="mt-1">{getIcon(conversation.type)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <h4 className="font-medium truncate">
                      {conversation.title || `Conversation ${conversation.id.slice(0, 8)}`}
                    </h4>
                    {unreadByConversation[conversation.id] > 0 && (
                      <Badge variant="destructive" className="shrink-0">
                        {unreadByConversation[conversation.id]}
                      </Badge>
                    )}
                  </div>
                  {conversation.last_message_at && (
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDistanceToNow(new Date(conversation.last_message_at), {
                        addSuffix: true,
                      })}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>
                    {conversation.participants.length} participant
                    {conversation.participants.length !== 1 ? "s" : ""}
                  </span>
                  {conversation.has_attachments && (
                    <>
                      <span>•</span>
                      <div className="flex items-center gap-1">
                        <Paperclip className="h-3 w-3" />
                        <span>{conversation.attachment_count}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </ScrollArea>
  );
}
