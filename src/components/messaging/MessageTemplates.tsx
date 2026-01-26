import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, Plus, Trash2, Edit2, Zap } from "lucide-react";
import { toast } from "sonner";

interface MessageTemplate {
  id: string;
  name: string;
  content: string;
  shortcut: string | null;
  category: string;
  usage_count: number;
}

interface MessageTemplatesProps {
  onSelectTemplate: (content: string) => void;
}

export function MessageTemplates({ onSelectTemplate }: MessageTemplatesProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [formData, setFormData] = useState({ name: "", content: "", shortcut: "", category: "general" });
  const queryClient = useQueryClient();

  const { data: templates = [] } = useQuery({
    queryKey: ["messageTemplates"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("message_templates")
        .select("*")
        .eq("user_id", user.id)
        .order("usage_count", { ascending: false });

      if (error) throw error;
      return data as MessageTemplate[];
    },
  });

  const createTemplate = useMutation({
    mutationFn: async (data: { name: string; content: string; shortcut: string; category: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("message_templates").insert({
        user_id: user.id,
        name: data.name,
        content: data.content,
        shortcut: data.shortcut || null,
        category: data.category,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messageTemplates"] });
      setShowCreateDialog(false);
      setFormData({ name: "", content: "", shortcut: "", category: "general" });
      toast.success("Template created");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create template: ${error.message}`);
    },
  });

  const updateTemplate = useMutation({
    mutationFn: async ({ id, ...data }: { id: string; name: string; content: string; shortcut: string }) => {
      const { error } = await supabase
        .from("message_templates")
        .update({ name: data.name, content: data.content, shortcut: data.shortcut || null })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messageTemplates"] });
      setIsEditing(null);
      toast.success("Template updated");
    },
  });

  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("message_templates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messageTemplates"] });
      toast.success("Template deleted");
    },
  });

  const useTemplate = async (template: MessageTemplate) => {
    onSelectTemplate(template.content);
    setIsOpen(false);

    // Increment usage count
    await supabase
      .from("message_templates")
      .update({ usage_count: template.usage_count + 1 })
      .eq("id", template.id);
  };

  return (
    <>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="icon" title="Message templates">
            <FileText className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="start">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Templates</h4>
              <Button size="sm" variant="ghost" onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-1" />
                New
              </Button>
            </div>

            <ScrollArea className="h-64">
              {templates.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No templates yet. Create one!
                </p>
              ) : (
                <div className="space-y-2">
                  {templates.map((template) => (
                    <div
                      key={template.id}
                      className="p-2 rounded-lg border hover:bg-muted/50 cursor-pointer group"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1" onClick={() => useTemplate(template)}>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{template.name}</span>
                            {template.shortcut && (
                              <span className="text-xs bg-muted px-1.5 py-0.5 rounded flex items-center gap-1">
                                <Zap className="h-3 w-3" />
                                /{template.shortcut}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                            {template.content}
                          </p>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6"
                            onClick={(e) => {
                              e.stopPropagation();
                              setIsEditing(template.id);
                              setFormData({
                                name: template.name,
                                content: template.content,
                                shortcut: template.shortcut || "",
                                category: template.category,
                              });
                            }}
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteTemplate.mutate(template.id);
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </PopoverContent>
      </Popover>

      {/* Create/Edit Dialog */}
      <Dialog open={showCreateDialog || isEditing !== null} onOpenChange={(open) => {
        if (!open) {
          setShowCreateDialog(false);
          setIsEditing(null);
          setFormData({ name: "", content: "", shortcut: "", category: "general" });
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isEditing ? "Edit Template" : "Create Template"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Greeting"
              />
            </div>
            <div className="space-y-2">
              <Label>Content</Label>
              <Textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Template message content..."
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label>Shortcut (optional)</Label>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">/</span>
                <Input
                  value={formData.shortcut}
                  onChange={(e) => setFormData({ ...formData, shortcut: e.target.value.replace(/\s/g, "") })}
                  placeholder="greet"
                  className="flex-1"
                />
              </div>
              <p className="text-xs text-muted-foreground">Type /{formData.shortcut || "shortcut"} to quickly insert this template</p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => {
                setShowCreateDialog(false);
                setIsEditing(null);
              }}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (isEditing) {
                    updateTemplate.mutate({ id: isEditing, ...formData });
                  } else {
                    createTemplate.mutate(formData);
                  }
                }}
                disabled={!formData.name || !formData.content}
              >
                {isEditing ? "Update" : "Create"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
