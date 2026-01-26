import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Archive, ArchiveRestore } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";

interface ConversationArchiveProps {
  conversationId: string;
}

export function ConversationArchive({ conversationId }: ConversationArchiveProps) {
  const queryClient = useQueryClient();

  const { data: isArchived = false } = useQuery({
    queryKey: ["archivedConversation", conversationId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { data } = await supabase
        .from("archived_conversations")
        .select("id")
        .eq("conversation_id", conversationId)
        .eq("user_id", user.id)
        .maybeSingle();

      return !!data;
    },
  });

  const toggleArchive = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      if (isArchived) {
        const { error } = await supabase
          .from("archived_conversations")
          .delete()
          .eq("conversation_id", conversationId)
          .eq("user_id", user.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("archived_conversations")
          .insert({
            conversation_id: conversationId,
            user_id: user.id,
          });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["archivedConversation", conversationId] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      toast.success(isArchived ? "Conversation unarchived" : "Conversation archived");
    },
    onError: (error: Error) => {
      toast.error(`Failed to ${isArchived ? "unarchive" : "archive"}: ${error.message}`);
    },
  });

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => toggleArchive.mutate()}
          disabled={toggleArchive.isPending}
        >
          {isArchived ? (
            <ArchiveRestore className="h-4 w-4" />
          ) : (
            <Archive className="h-4 w-4" />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        {isArchived ? "Unarchive conversation" : "Archive conversation"}
      </TooltipContent>
    </Tooltip>
  );
}

// Hook to filter archived conversations
export function useArchivedConversations() {
  return useQuery({
    queryKey: ["archivedConversations"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("archived_conversations")
        .select("conversation_id")
        .eq("user_id", user.id);

      if (error) throw error;
      return data.map((a) => a.conversation_id);
    },
  });
}
