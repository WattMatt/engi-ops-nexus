import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Pin, X, ChevronDown, ChevronUp } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface PinnedMessagesProps {
  conversationId: string;
  onMessageSelect: (messageId: string) => void;
}

export function PinnedMessages({ conversationId, onMessageSelect }: PinnedMessagesProps) {
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: pinnedMessages = [] } = useQuery({
    queryKey: ["pinned-messages", conversationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pinned_messages")
        .select(`
          *,
          message:message_id(id, content, created_at, sender_id, profiles:sender_id(full_name)),
          pinned_by_profile:pinned_by(full_name)
        `)
        .eq("conversation_id", conversationId)
        .order("pinned_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const unpinMessage = useMutation({
    mutationFn: async (messageId: string) => {
      const { error } = await supabase
        .from("pinned_messages")
        .delete()
        .eq("message_id", messageId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pinned-messages", conversationId] });
    },
  });

  if (pinnedMessages.length === 0) return null;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="border-b bg-muted/30">
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="w-full justify-between rounded-none h-10 px-4"
          >
            <div className="flex items-center gap-2">
              <Pin className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">
                {pinnedMessages.length} pinned message{pinnedMessages.length !== 1 ? "s" : ""}
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
              {pinnedMessages.map((pinned: any) => (
                <div
                  key={pinned.id}
                  className="flex items-start gap-2 p-2 rounded bg-background border group"
                >
                  <button
                    onClick={() => onMessageSelect(pinned.message.id)}
                    className="flex-1 text-left"
                  >
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">
                        {pinned.message.profiles?.full_name || "Unknown"}
                      </span>
                      <span>•</span>
                      <span>
                        {formatDistanceToNow(new Date(pinned.message.created_at), {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                    <p className="text-sm truncate mt-0.5">{pinned.message.content}</p>
                  </button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                    onClick={() => unpinMessage.mutate(pinned.message_id)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

export function usePinMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      messageId,
      conversationId,
    }: {
      messageId: string;
      conversationId: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Check if already pinned
      const { data: existing } = await supabase
        .from("pinned_messages")
        .select("id")
        .eq("message_id", messageId)
        .single();

      if (existing) {
        // Unpin
        await supabase.from("pinned_messages").delete().eq("message_id", messageId);
      } else {
        // Pin
        await supabase.from("pinned_messages").insert({
          message_id: messageId,
          conversation_id: conversationId,
          pinned_by: user.id,
        });
      }
    },
    onSuccess: (_, { conversationId }) => {
      queryClient.invalidateQueries({ queryKey: ["pinned-messages", conversationId] });
    },
  });
}
