import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState, useEffect } from "react";

export interface Conversation {
  id: string;
  type: 'direct' | 'group' | 'project_thread';
  project_id?: string;
  title?: string;
  participants: string[];
  last_message_at?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  has_attachments?: boolean;
  attachment_count?: number;
  project?: {
    id: string;
    name: string;
    project_number: string;
  };
}

export const useConversations = (projectId?: string | null) => {
  const queryClient = useQueryClient();
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(
    projectId ?? localStorage.getItem("selectedProjectId")
  );

  // Listen for project changes
  useEffect(() => {
    const handleProjectChange = () => {
      const newProjectId = localStorage.getItem("selectedProjectId");
      setCurrentProjectId(newProjectId);
    };
    
    window.addEventListener('projectChanged', handleProjectChange);
    window.addEventListener('storage', handleProjectChange);
    
    return () => {
      window.removeEventListener('projectChanged', handleProjectChange);
      window.removeEventListener('storage', handleProjectChange);
    };
  }, []);

  // Update when projectId prop changes
  useEffect(() => {
    if (projectId !== undefined) {
      setCurrentProjectId(projectId);
    }
  }, [projectId]);

  const { data: conversations, isLoading } = useQuery({
    queryKey: ["conversations", currentProjectId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      let query = supabase
        .from("conversations")
        .select(`
          *,
          project:projects(id, name, project_number)
        `)
        .or(`created_by.eq.${user.id},participants.cs.["${user.id}"]`)
        .order("last_message_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });

      // Filter by project if one is selected
      if (currentProjectId) {
        query = query.eq("project_id", currentProjectId);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      const conversations = data as Conversation[];

      // Fetch attachment info for each conversation
      const conversationsWithAttachments = await Promise.all(
        conversations.map(async (conv) => {
          const { data: messagesWithAttachments } = await supabase
            .from("messages")
            .select("id, attachments")
            .eq("conversation_id", conv.id)
            .not("attachments", "is", null);

          const totalAttachments = messagesWithAttachments?.reduce(
            (sum, msg) => {
              const attachments = msg.attachments as any[];
              return sum + (Array.isArray(attachments) ? attachments.length : 0);
            },
            0
          ) || 0;

          return {
            ...conv,
            has_attachments: totalAttachments > 0,
            attachment_count: totalAttachments,
          };
        })
      );

      return conversationsWithAttachments;
    },
  });

  const createConversation = useMutation({
    mutationFn: async (data: {
      type: Conversation["type"];
      title?: string;
      participants: string[];
      project_id?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: conversation, error } = await supabase
        .from("conversations")
        .insert({
          type: data.type,
          title: data.title,
          participants: data.participants,
          project_id: data.project_id,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return conversation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      toast.success("Conversation created");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create conversation: ${error.message}`);
    },
  });

  return {
    conversations,
    isLoading,
    createConversation: createConversation.mutate,
  };
};
