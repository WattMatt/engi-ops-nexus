import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Star, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

interface StarredMessage {
  id: string;
  message_id: string;
  starred_at: string;
  message: {
    id: string;
    content: string;
    created_at: string;
    sender_id: string;
  };
}

interface StarredMessagesProps {
  conversationId: string;
  onNavigateToMessage: (messageId: string) => void;
}

export function StarredMessages({ conversationId, onNavigateToMessage }: StarredMessagesProps) {
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: starredMessages = [] } = useQuery({
    queryKey: ["starred-messages", conversationId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("starred_messages")
        .select(`
          id,
          message_id,
          starred_at,
          message:messages!inner(id, content, created_at, sender_id, conversation_id)
        `)
        .eq("user_id", user.id)
        .eq("message.conversation_id", conversationId)
        .order("starred_at", { ascending: false });

      if (error) throw error;
      return data as unknown as StarredMessage[];
    },
  });

  if (starredMessages.length === 0) return null;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" className="w-full justify-between p-2 h-auto">
          <div className="flex items-center gap-2">
            <Star className="h-4 w-4 text-primary fill-primary" />
            <span className="text-sm font-medium">
              {starredMessages.length} starred message{starredMessages.length !== 1 ? "s" : ""}
            </span>
          </div>
          {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-1 mt-1">
        {starredMessages.map((starred) => (
          <button
            key={starred.id}
            onClick={() => onNavigateToMessage(starred.message_id)}
            className="w-full p-2 text-left hover:bg-muted rounded-md transition-colors"
          >
            <p className="text-sm line-clamp-2">{starred.message.content}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {formatDistanceToNow(new Date(starred.message.created_at), { addSuffix: true })}
            </p>
          </button>
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}

// Hook for starring/unstarring messages
export function useStarMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ messageId, isStarred }: { messageId: string; isStarred: boolean }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      if (isStarred) {
        const { error } = await supabase
          .from("starred_messages")
          .delete()
          .eq("message_id", messageId)
          .eq("user_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("starred_messages")
          .insert({ message_id: messageId, user_id: user.id });
        if (error) throw error;
      }
    },
    onSuccess: (_, { isStarred }) => {
      queryClient.invalidateQueries({ queryKey: ["starred-messages"] });
      queryClient.invalidateQueries({ queryKey: ["message-starred"] });
      toast.success(isStarred ? "Message unstarred" : "Message starred");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update star: ${error.message}`);
    },
  });
}

export function useIsMessageStarred(messageId: string) {
  return useQuery({
    queryKey: ["message-starred", messageId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { data, error } = await supabase
        .from("starred_messages")
        .select("id")
        .eq("message_id", messageId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      return !!data;
    },
  });
}
