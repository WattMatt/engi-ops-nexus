import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { MessageSquare, Users, FolderKanban, Search, Forward } from "lucide-react";
import { toast } from "sonner";

interface ForwardMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  messageId: string;
  messageContent: string;
  originalConversationId: string;
}

export function ForwardMessageDialog({
  open,
  onOpenChange,
  messageId,
  messageContent,
  originalConversationId,
}: ForwardMessageDialogProps) {
  const [selectedConversations, setSelectedConversations] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();

  const { data: conversations = [] } = useQuery({
    queryKey: ["all-conversations"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("conversations")
        .select("id, title, type, participants")
        .or(`created_by.eq.${user.id},participants.cs.["${user.id}"]`)
        .neq("id", originalConversationId)
        .order("last_message_at", { ascending: false, nullsFirst: false });

      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const forwardMessage = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      for (const conversationId of selectedConversations) {
        const { error } = await supabase.from("messages").insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content: messageContent,
          forwarded_from_message_id: messageId,
          forwarded_from_conversation_id: originalConversationId,
        });

        if (error) throw error;

        // Update conversation's last_message_at
        await supabase
          .from("conversations")
          .update({ last_message_at: new Date().toISOString() })
          .eq("id", conversationId);
      }
    },
    onSuccess: () => {
      toast.success(`Message forwarded to ${selectedConversations.length} conversation${selectedConversations.length !== 1 ? "s" : ""}`);
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      setSelectedConversations([]);
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(`Failed to forward message: ${error.message}`);
    },
  });

  const getIcon = (type: string) => {
    switch (type) {
      case "direct":
        return <MessageSquare className="h-4 w-4" />;
      case "group":
        return <Users className="h-4 w-4" />;
      case "project_thread":
        return <FolderKanban className="h-4 w-4" />;
      default:
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  const filteredConversations = conversations.filter((conv) =>
    (conv.title || "").toLowerCase().includes(search.toLowerCase())
  );

  const toggleConversation = (id: string) => {
    setSelectedConversations((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Forward className="h-5 w-5" />
            Forward Message
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Message preview */}
          <div className="p-3 rounded-lg bg-muted text-sm">
            <p className="line-clamp-3">{messageContent}</p>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Conversation list */}
          <ScrollArea className="h-64">
            <div className="space-y-1">
              {filteredConversations.map((conversation) => (
                <button
                  key={conversation.id}
                  onClick={() => toggleConversation(conversation.id)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors text-left"
                >
                  <Checkbox
                    checked={selectedConversations.includes(conversation.id)}
                    onCheckedChange={() => toggleConversation(conversation.id)}
                  />
                  <div className="flex-shrink-0">{getIcon(conversation.type)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {conversation.title || `Conversation ${conversation.id.slice(0, 8)}`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {Array.isArray(conversation.participants) ? conversation.participants.length : 0} participants
                    </p>
                  </div>
                </button>
              ))}

              {filteredConversations.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-8">
                  No conversations found
                </p>
              )}
            </div>
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => forwardMessage.mutate()}
            disabled={selectedConversations.length === 0 || forwardMessage.isPending}
          >
            Forward to {selectedConversations.length || ""} conversation{selectedConversations.length !== 1 ? "s" : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
