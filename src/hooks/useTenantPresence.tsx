import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

interface EditingUser {
  userId: string;
  userName: string;
  tenantId: string;
}

export const useTenantPresence = (projectId: string) => {
  const [editingUsers, setEditingUsers] = useState<EditingUser[]>([]);
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
    if (!projectId || !currentUser) return;

    const roomChannel = supabase.channel(`tenant-editing:${projectId}`);

    roomChannel
      .on("presence", { event: "sync" }, () => {
        const presenceState = roomChannel.presenceState();
        const users: EditingUser[] = [];

        Object.keys(presenceState).forEach((key) => {
          const presences = presenceState[key];
          presences.forEach((presence: any) => {
            if (presence.tenantId) {
              users.push({
                userId: presence.userId,
                userName: presence.userName,
                tenantId: presence.tenantId,
              });
            }
          });
        });

        setEditingUsers(users);
      })
      .subscribe();

    setChannel(roomChannel);

    return () => {
      supabase.removeChannel(roomChannel);
    };
  }, [projectId, currentUser]);

  const setEditing = async (tenantId: string | null) => {
    if (!channel || !currentUser) return;

    await channel.track({
      userId: currentUser.id,
      userName: currentUser.name,
      tenantId: tenantId,
    });
  };

  const getEditingUser = (tenantId: string) => {
    return editingUsers.find(
      (user) => user.tenantId === tenantId && user.userId !== currentUser?.id
    );
  };

  return {
    editingUsers,
    setEditing,
    getEditingUser,
    currentUserId: currentUser?.id,
  };
};
