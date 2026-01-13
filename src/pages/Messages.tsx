import { useState, useEffect } from "react";
import { useConversations } from "@/hooks/useConversations";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageSquarePlus, FolderKanban, AlertCircle } from "lucide-react";
import { ConversationsList } from "@/components/messaging/ConversationsList";
import { ChatWindow } from "@/components/messaging/ChatWindow";
import { NewConversationDialog } from "@/components/messaging/NewConversationDialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function Messages() {
  const [selectedConversationId, setSelectedConversationId] = useState<string>();
  const [isNewConversationOpen, setIsNewConversationOpen] = useState(false);
  const [projectId, setProjectId] = useState<string | null>(
    localStorage.getItem("selectedProjectId")
  );

  // Listen for project changes
  useEffect(() => {
    const handleProjectChange = () => {
      const newProjectId = localStorage.getItem("selectedProjectId");
      setProjectId(newProjectId);
      setSelectedConversationId(undefined); // Clear selection when project changes
    };
    
    window.addEventListener('projectChanged', handleProjectChange);
    window.addEventListener('storage', handleProjectChange);
    
    return () => {
      window.removeEventListener('projectChanged', handleProjectChange);
      window.removeEventListener('storage', handleProjectChange);
    };
  }, []);

  const { conversations, isLoading } = useConversations(projectId);

  // Fetch project details
  const { data: project } = useQuery({
    queryKey: ["project-for-messages", projectId],
    queryFn: async () => {
      if (!projectId) return null;
      const { data } = await supabase
        .from("projects")
        .select("id, name, project_number")
        .eq("id", projectId)
        .single();
      return data;
    },
    enabled: !!projectId,
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">Messages</h1>
            {project && (
              <Badge variant="outline" className="gap-1.5">
                <FolderKanban className="h-3.5 w-3.5" />
                {project.project_number}: {project.name}
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground">
            {project 
              ? `Discussions for this project only`
              : "Select a project to view project-specific discussions"
            }
          </p>
        </div>
        <Button 
          onClick={() => setIsNewConversationOpen(true)}
          disabled={!projectId}
        >
          <MessageSquarePlus className="mr-2 h-4 w-4" />
          New Conversation
        </Button>
      </div>

      {!projectId ? (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please select a project from the dropdown above to view and create discussions. 
            Messages are ring-fenced to their respective projects for security.
          </AlertDescription>
        </Alert>
      ) : (
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
      )}

      <NewConversationDialog
        open={isNewConversationOpen}
        onOpenChange={setIsNewConversationOpen}
        projectId={projectId || undefined}
        onCreated={(conversationId) => {
          setSelectedConversationId(conversationId);
          setIsNewConversationOpen(false);
        }}
      />
    </div>
  );
}
