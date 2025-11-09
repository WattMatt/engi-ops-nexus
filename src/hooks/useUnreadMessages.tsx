import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

export const useUnreadMessages = () => {
  const { data: unreadCounts, refetch } = useQuery({
    queryKey: ["unreadMessages"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { total: 0, byConversation: {} };

      // Get all conversations for the user
      const { data: conversations } = await supabase
        .from("conversations")
        .select("id")
        .or(`created_by.eq.${user.id},participants.cs.["${user.id}"]`);

      if (!conversations) return { total: 0, byConversation: {} };

      const conversationIds = conversations.map((c) => c.id);
      
      // Get unread message counts for each conversation
      const { data: messages } = await supabase
        .from("messages")
        .select("conversation_id, id")
        .in("conversation_id", conversationIds)
        .neq("sender_id", user.id)
        .eq("is_read", false);

      const byConversation: Record<string, number> = {};
      messages?.forEach((msg) => {
        byConversation[msg.conversation_id] = (byConversation[msg.conversation_id] || 0) + 1;
      });

      return {
        total: messages?.length || 0,
        byConversation,
      };
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Subscribe to real-time message updates
  useEffect(() => {
    const setupSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      const channel = supabase
        .channel("unread-messages")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "messages",
          },
          () => {
            refetch();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    };

    setupSubscription();
  }, [refetch]);

  return {
    totalUnread: unreadCounts?.total || 0,
    unreadByConversation: unreadCounts?.byConversation || {},
    refetch,
  };
};
