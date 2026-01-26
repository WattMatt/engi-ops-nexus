import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useEffect } from "react";

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  mentions: string[];
  attachments: any[];
  is_read: boolean;
  read_by: string[];
  created_at: string;
  updated_at: string;
  // Extended fields
  voice_message_url?: string;
  voice_duration_seconds?: number;
  parent_message_id?: string;
  reply_count?: number;
  is_edited?: boolean;
  edited_at?: string;
  is_deleted?: boolean;
  deleted_at?: string;
  forwarded_from_message_id?: string;
  forwarded_from_conversation_id?: string;
}

export const useMessages = (conversationId?: string) => {
  const queryClient = useQueryClient();

  const { data: messages, isLoading } = useQuery({
    queryKey: ["messages", conversationId],
    queryFn: async () => {
      if (!conversationId) return [];

      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data as Message[];
    },
    enabled: !!conversationId,
  });

  // Subscribe to real-time messages
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          queryClient.setQueryData(
            ["messages", conversationId],
            (old: Message[] = []) => [...old, payload.new as Message]
          );
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          queryClient.setQueryData(
            ["messages", conversationId],
            (old: Message[] = []) =>
              old.map((msg) =>
                msg.id === payload.new.id ? (payload.new as Message) : msg
              )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, queryClient]);

  const sendMessage = useMutation({
    mutationFn: async (data: {
      conversation_id: string;
      content: string;
      mentions?: string[];
      attachments?: any[];
      voice_message_url?: string;
      voice_duration_seconds?: number;
      content_type?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: message, error } = await supabase
        .from("messages")
        .insert({
          conversation_id: data.conversation_id,
          sender_id: user.id,
          content: data.content,
          mentions: data.mentions || [],
          attachments: data.attachments || [],
          voice_message_url: data.voice_message_url,
          voice_duration_seconds: data.voice_duration_seconds,
          content_type: data.content_type || "plain",
        })
        .select()
        .single();

      if (error) throw error;

      // Update conversation's last_message_at
      await supabase
        .from("conversations")
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", data.conversation_id);

      // Get conversation participants to notify
      const { data: conversation } = await supabase
        .from("conversations")
        .select("participants")
        .eq("id", data.conversation_id)
        .single();

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();

      const senderName = profile?.full_name || "Someone";

      // Get participants to notify (everyone except sender)
      const participants = conversation?.participants;
      const participantsArray = Array.isArray(participants) ? participants : [];
      const participantsToNotify = participantsArray.filter(
        (p: string) => p !== user.id
      );

      // Send push notifications to all other participants
      if (participantsToNotify.length > 0) {
        await supabase.functions.invoke("send-push-notification", {
          body: {
            userIds: participantsToNotify,
            title: `New message from ${senderName}`,
            body: data.content.substring(0, 100) + (data.content.length > 100 ? "..." : ""),
            conversationId: data.conversation_id,
          },
        });
      }

      // Send email notifications for mentions
      if (data.mentions && data.mentions.length > 0) {
        for (const mentionedUserId of data.mentions) {
          await supabase.functions.invoke("send-message-notification", {
            body: {
              userId: mentionedUserId,
              messageId: message.id,
              senderName,
              messagePreview: data.content.substring(0, 100),
              conversationId: data.conversation_id,
            },
          });
        }
      }

      return message;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to send message: ${error.message}`);
    },
  });

  const markAsRead = useMutation({
    mutationFn: async (messageId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("messages")
        .update({ is_read: true })
        .eq("id", messageId);

      if (error) throw error;
    },
  });

  return {
    messages,
    isLoading,
    sendMessage: sendMessage.mutate,
    markAsRead: markAsRead.mutate,
  };
};
