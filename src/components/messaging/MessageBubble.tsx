import { Message } from "@/hooks/useMessages";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { Paperclip } from "lucide-react";

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
}

export function MessageBubble({ message, isOwn }: MessageBubbleProps) {
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

  const senderName = sender?.full_name || sender?.email || "Unknown";
  const initials = senderName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

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
      </div>
    </div>
  );
}
