import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Clock, X, Send, ChevronDown, ChevronUp } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { useState } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { toast } from "sonner";

interface ScheduledMessagesListProps {
  conversationId: string;
}

export function ScheduledMessagesList({ conversationId }: ScheduledMessagesListProps) {
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: scheduledMessages = [] } = useQuery({
    queryKey: ["scheduled-messages", conversationId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("scheduled_messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .eq("sender_id", user.id)
        .eq("status", "pending")
        .order("scheduled_for", { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  const cancelMessage = useMutation({
    mutationFn: async (messageId: string) => {
      const { error } = await supabase
        .from("scheduled_messages")
        .update({ status: "cancelled" })
        .eq("id", messageId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scheduled-messages", conversationId] });
      toast.success("Scheduled message cancelled");
    },
  });

  const sendNow = useMutation({
    mutationFn: async (message: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Create the actual message
      const { error: messageError } = await supabase.from("messages").insert({
        conversation_id: message.conversation_id,
        sender_id: user.id,
        content: message.content,
        mentions: message.mentions || [],
        attachments: message.attachments || [],
      });

      if (messageError) throw messageError;

      // Mark scheduled message as sent
      const { error: updateError } = await supabase
        .from("scheduled_messages")
        .update({ status: "sent", sent_at: new Date().toISOString() })
        .eq("id", message.id);

      if (updateError) throw updateError;

      // Update conversation's last_message_at
      await supabase
        .from("conversations")
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", message.conversation_id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scheduled-messages", conversationId] });
      queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
      toast.success("Message sent");
    },
  });

  if (scheduledMessages.length === 0) return null;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="border-b bg-accent/30">
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="w-full justify-between rounded-none h-10 px-4"
          >
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">
                {scheduledMessages.length} scheduled message{scheduledMessages.length !== 1 ? "s" : ""}
              </span>
            </div>
            {isOpen ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <ScrollArea className="max-h-40 px-4 pb-2">
            <div className="space-y-2">
              {scheduledMessages.map((message) => (
                <div
                  key={message.id}
                  className="flex items-start gap-2 p-2 rounded bg-background border group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>
                        {format(new Date(message.scheduled_for), "PPp")}
                      </span>
                      <span className="text-primary">
                        ({formatDistanceToNow(new Date(message.scheduled_for), { addSuffix: true })})
                      </span>
                    </div>
                    <p className="text-sm truncate mt-1">{message.content}</p>
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => sendNow.mutate(message)}
                      title="Send now"
                    >
                      <Send className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => cancelMessage.mutate(message.id)}
                      title="Cancel"
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
