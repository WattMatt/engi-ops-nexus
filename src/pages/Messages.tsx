import { useState } from "react";
import { useConversations } from "@/hooks/useConversations";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquarePlus } from "lucide-react";
import { ConversationsList } from "@/components/messaging/ConversationsList";
import { ChatWindow } from "@/components/messaging/ChatWindow";
import { NewConversationDialog } from "@/components/messaging/NewConversationDialog";

export default function Messages() {
  const [selectedConversationId, setSelectedConversationId] = useState<string>();
  const [isNewConversationOpen, setIsNewConversationOpen] = useState(false);
  const { conversations, isLoading } = useConversations();

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Messages</h1>
          <p className="text-muted-foreground">Communicate with your team</p>
        </div>
        <Button onClick={() => setIsNewConversationOpen(true)}>
          <MessageSquarePlus className="mr-2 h-4 w-4" />
          New Conversation
        </Button>
      </div>

      <div className="grid grid-cols-12 gap-6 h-[calc(100vh-220px)]">
        <Card className="col-span-4 p-4 overflow-auto">
          <ConversationsList
            conversations={conversations || []}
            selectedId={selectedConversationId}
            onSelect={setSelectedConversationId}
            isLoading={isLoading}
          />
        </Card>

        <Card className="col-span-8 p-0 overflow-hidden">
          {selectedConversationId ? (
            <ChatWindow conversationId={selectedConversationId} />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center">
                <MessageSquarePlus className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Select a conversation or start a new one</p>
              </div>
            </div>
          )}
        </Card>
      </div>

      <NewConversationDialog
        open={isNewConversationOpen}
        onOpenChange={setIsNewConversationOpen}
        onCreated={(conversationId) => {
          setSelectedConversationId(conversationId);
          setIsNewConversationOpen(false);
        }}
      />
    </div>
  );
}
