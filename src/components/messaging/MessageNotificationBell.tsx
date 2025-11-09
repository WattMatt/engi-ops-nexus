import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";
import { useNavigate } from "react-router-dom";
import { useConversations } from "@/hooks/useConversations";
import { formatDistanceToNow } from "date-fns";

export function MessageNotificationBell() {
  const { totalUnread, unreadByConversation } = useUnreadMessages();
  const { conversations } = useConversations();
  const navigate = useNavigate();

  const conversationsWithUnread = conversations
    ?.filter((conv) => unreadByConversation[conv.id] > 0)
    .sort((a, b) => {
      const aTime = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
      const bTime = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
      return bTime - aTime;
    })
    .slice(0, 5); // Show max 5 recent conversations

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {totalUnread > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {totalUnread > 9 ? "9+" : totalUnread}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Message Notifications</span>
          {totalUnread > 0 && (
            <Badge variant="secondary">{totalUnread} unread</Badge>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {conversationsWithUnread && conversationsWithUnread.length > 0 ? (
          <>
            {conversationsWithUnread.map((conversation) => (
              <DropdownMenuItem
                key={conversation.id}
                onClick={() => navigate(`/dashboard/messages?conversation=${conversation.id}`)}
                className="cursor-pointer flex flex-col items-start gap-1 py-3"
              >
                <div className="flex items-center justify-between w-full">
                  <span className="font-medium truncate">
                    {conversation.title || `Conversation ${conversation.id.slice(0, 8)}`}
                  </span>
                  <Badge variant="destructive" className="ml-2 shrink-0">
                    {unreadByConversation[conversation.id]}
                  </Badge>
                </div>
                {conversation.last_message_at && (
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(conversation.last_message_at), {
                      addSuffix: true,
                    })}
                  </span>
                )}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => navigate("/dashboard/messages")}
              className="cursor-pointer text-center justify-center text-primary"
            >
              View all messages
            </DropdownMenuItem>
          </>
        ) : (
          <div className="px-2 py-6 text-center text-sm text-muted-foreground">
            No unread messages
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
