import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useConversations } from "@/hooks/useConversations";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";

interface NewConversationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (conversationId: string) => void;
  projectId?: string;
}

export function NewConversationDialog({
  open,
  onOpenChange,
  onCreated,
  projectId,
}: NewConversationDialogProps) {
  const [type, setType] = useState<"direct" | "group" | "project_thread">("project_thread");
  const [title, setTitle] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const { createConversation } = useConversations(projectId);

  const { data: users } = useQuery({
    queryKey: ["users-for-conversation", projectId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      // If project is selected, get project members; otherwise get all users
      if (projectId) {
        const { data: projectMembers } = await supabase
          .from("project_members")
          .select("user_id, profiles:user_id(id, full_name, email)")
          .eq("project_id", projectId);
        
        return projectMembers?.map((pm: any) => pm.profiles).filter(Boolean) || [];
      }

      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .neq("id", user.id);

      return data || [];
    },
    enabled: open,
  });

  const handleCreate = () => {
    if (selectedUsers.length === 0) return;

    createConversation(
      {
        type,
        title: type === "direct" ? undefined : title,
        participants: selectedUsers,
        project_id: projectId, // Always attach to current project
      },
      {
        onSuccess: (data) => {
          onCreated(data.id);
          setTitle("");
          setSelectedUsers([]);
          setType("project_thread");
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New Conversation</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Conversation Type</Label>
            <RadioGroup value={type} onValueChange={(v: any) => setType(v)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="direct" id="direct" />
                <Label htmlFor="direct">Direct Message</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="group" id="group" />
                <Label htmlFor="group">Group Chat</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="project_thread" id="project" />
                <Label htmlFor="project">Project Thread</Label>
              </div>
            </RadioGroup>
          </div>

          {type !== "direct" && (
            <div className="space-y-2">
              <Label htmlFor="title">Conversation Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter conversation title"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label>Select Participants</Label>
            <ScrollArea className="h-[200px] border rounded-md p-4">
              <div className="space-y-3">
                {users?.map((user) => (
                  <div key={user.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={user.id}
                      checked={selectedUsers.includes(user.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedUsers([...selectedUsers, user.id]);
                        } else {
                          setSelectedUsers(selectedUsers.filter((id) => id !== user.id));
                        }
                      }}
                    />
                    <Label htmlFor={user.id} className="font-normal cursor-pointer">
                      {user.full_name || user.email}
                    </Label>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={selectedUsers.length === 0 || (type !== "direct" && !title)}
            >
              Create
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
