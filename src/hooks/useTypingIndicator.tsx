import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

interface TypingUser {
  userId: string;
  userName: string;
  timestamp: number;
}

export const useTypingIndicator = (conversationId: string) => {
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [channel, setChannel] = useState<any>(null);

  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();

      return {
        id: user.id,
        name: profile?.full_name || "Unknown User",
      };
    },
  });

  useEffect(() => {
    if (!conversationId || !currentUser) return;

    const roomChannel = supabase.channel(`typing:${conversationId}`);

    roomChannel
      .on("presence", { event: "sync" }, () => {
        const presenceState = roomChannel.presenceState();
        const users: TypingUser[] = [];

        Object.keys(presenceState).forEach((key) => {
          const presences = presenceState[key];
          presences.forEach((presence: any) => {
            if (presence.userId !== currentUser.id && presence.isTyping) {
              users.push({
                userId: presence.userId,
                userName: presence.userName,
                timestamp: presence.timestamp,
              });
            }
          });
        });

        // Remove stale typing indicators (older than 5 seconds)
        const now = Date.now();
        const activeUsers = users.filter((user) => now - user.timestamp < 5000);
        setTypingUsers(activeUsers);
      })
      .subscribe();

    setChannel(roomChannel);

    return () => {
      supabase.removeChannel(roomChannel);
    };
  }, [conversationId, currentUser]);

  const setTyping = async (isTyping: boolean) => {
    if (!channel || !currentUser) return;

    await channel.track({
      userId: currentUser.id,
      userName: currentUser.name,
      isTyping,
      timestamp: Date.now(),
    });
  };

  return {
    typingUsers,
    setTyping,
  };
};
