import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BellOff, Bell, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { addHours, addDays, addWeeks } from "date-fns";

interface MuteConversationProps {
  conversationId: string;
}

export function MuteConversation({ conversationId }: MuteConversationProps) {
  const queryClient = useQueryClient();

  const { data: muteStatus } = useQuery({
    queryKey: ["mute-status", conversationId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from("muted_conversations")
        .select("*")
        .eq("conversation_id", conversationId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      
      // Check if mute has expired
      if (data?.mute_until && new Date(data.mute_until) < new Date()) {
        // Auto-unmute expired mutes
        await supabase
          .from("muted_conversations")
          .delete()
          .eq("id", data.id);
        return null;
      }
      
      return data;
    },
  });

  const muteMutation = useMutation({
    mutationFn: async (muteUntil: Date | null) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Remove existing mute first
      await supabase
        .from("muted_conversations")
        .delete()
        .eq("conversation_id", conversationId)
        .eq("user_id", user.id);

      // Add new mute
      const { error } = await supabase
        .from("muted_conversations")
        .insert({
          conversation_id: conversationId,
          user_id: user.id,
          mute_until: muteUntil?.toISOString() || null,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mute-status", conversationId] });
      toast.success("Conversation muted");
    },
    onError: (error: Error) => {
      toast.error(`Failed to mute: ${error.message}`);
    },
  });

  const unmuteMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("muted_conversations")
        .delete()
        .eq("conversation_id", conversationId)
        .eq("user_id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mute-status", conversationId] });
      toast.success("Conversation unmuted");
    },
    onError: (error: Error) => {
      toast.error(`Failed to unmute: ${error.message}`);
    },
  });

  const isMuted = !!muteStatus;

  if (isMuted) {
    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={() => unmuteMutation.mutate()}
        title="Unmute conversation"
      >
        <BellOff className="h-4 w-4 text-muted-foreground" />
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" title="Mute conversation">
          <Bell className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => muteMutation.mutate(addHours(new Date(), 1))}>
          <Clock className="mr-2 h-4 w-4" />
          Mute for 1 hour
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => muteMutation.mutate(addHours(new Date(), 8))}>
          <Clock className="mr-2 h-4 w-4" />
          Mute for 8 hours
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => muteMutation.mutate(addDays(new Date(), 1))}>
          <Clock className="mr-2 h-4 w-4" />
          Mute for 1 day
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => muteMutation.mutate(addWeeks(new Date(), 1))}>
          <Clock className="mr-2 h-4 w-4" />
          Mute for 1 week
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => muteMutation.mutate(null)}>
          <BellOff className="mr-2 h-4 w-4" />
          Mute indefinitely
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Hook to check if conversation is muted
export function useIsConversationMuted(conversationId: string) {
  return useQuery({
    queryKey: ["mute-status", conversationId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { data, error } = await supabase
        .from("muted_conversations")
        .select("mute_until")
        .eq("conversation_id", conversationId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      
      if (!data) return false;
      if (data.mute_until && new Date(data.mute_until) < new Date()) return false;
      
      return true;
    },
  });
}
