import { cn } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface Reaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
}

interface MessageReactionsProps {
  messageId: string;
  currentUserId?: string;
}

export function MessageReactions({ messageId, currentUserId }: MessageReactionsProps) {
  const queryClient = useQueryClient();

  const { data: reactions = [] } = useQuery({
    queryKey: ["message-reactions", messageId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("message_reactions")
        .select("*")
        .eq("message_id", messageId);

      if (error) throw error;

      // Fetch profiles separately
      const userIds = [...new Set(data.map((r) => r.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds);

      const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);

      return data.map((r) => ({
        ...r,
        profiles: profileMap.get(r.user_id) || null,
      })) as (Reaction & { profiles: { full_name: string } | null })[];
    },
  });

  const toggleReaction = useMutation({
    mutationFn: async (emoji: string) => {
      if (!currentUserId) throw new Error("Not authenticated");

      const existing = reactions.find(
        (r) => r.emoji === emoji && r.user_id === currentUserId
      );

      if (existing) {
        await supabase
          .from("message_reactions")
          .delete()
          .eq("id", existing.id);
      } else {
        await supabase.from("message_reactions").insert({
          message_id: messageId,
          user_id: currentUserId,
          emoji,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["message-reactions", messageId] });
    },
  });

  // Group reactions by emoji
  const groupedReactions = reactions.reduce((acc, reaction) => {
    if (!acc[reaction.emoji]) {
      acc[reaction.emoji] = [];
    }
    acc[reaction.emoji].push(reaction);
    return acc;
  }, {} as Record<string, typeof reactions>);

  if (Object.keys(groupedReactions).length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {Object.entries(groupedReactions).map(([emoji, emojiReactions]) => {
        const userReacted = emojiReactions.some((r) => r.user_id === currentUserId);
        const names = emojiReactions
          .map((r) => r.profiles?.full_name || "Unknown")
          .join(", ");

        return (
          <Tooltip key={emoji}>
            <TooltipTrigger asChild>
              <button
                onClick={() => toggleReaction.mutate(emoji)}
                className={cn(
                  "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-colors",
                  userReacted
                    ? "bg-primary/10 border-primary/30 text-primary"
                    : "bg-muted border-transparent hover:border-muted-foreground/20"
                )}
              >
                <span>{emoji}</span>
                <span>{emojiReactions.length}</span>
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{names}</p>
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}

export function useAddReaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ messageId, emoji }: { messageId: string; emoji: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Check if already reacted
      const { data: existing } = await supabase
        .from("message_reactions")
        .select("id")
        .eq("message_id", messageId)
        .eq("user_id", user.id)
        .eq("emoji", emoji)
        .single();

      if (existing) {
        await supabase.from("message_reactions").delete().eq("id", existing.id);
      } else {
        await supabase.from("message_reactions").insert({
          message_id: messageId,
          user_id: user.id,
          emoji,
        });
      }
    },
    onSuccess: (_, { messageId }) => {
      queryClient.invalidateQueries({ queryKey: ["message-reactions", messageId] });
    },
  });
}
