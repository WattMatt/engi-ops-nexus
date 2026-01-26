import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tag, Plus, X, Check } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ConversationLabelsProps {
  conversationId: string;
}

const LABEL_COLORS = [
  "#ef4444", // red
  "#f97316", // orange
  "#eab308", // yellow
  "#22c55e", // green
  "#06b6d4", // cyan
  "#3b82f6", // blue
  "#8b5cf6", // violet
  "#ec4899", // pink
];

export function ConversationLabels({ conversationId }: ConversationLabelsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [newLabelName, setNewLabelName] = useState("");
  const [selectedColor, setSelectedColor] = useState(LABEL_COLORS[0]);
  const queryClient = useQueryClient();

  // Fetch all available labels
  const { data: allLabels } = useQuery({
    queryKey: ["conversation-labels"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("conversation_labels")
        .select("*")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch labels assigned to this conversation
  const { data: assignedLabels } = useQuery({
    queryKey: ["conversation-label-assignments", conversationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("conversation_label_assignments")
        .select("*, label:conversation_labels(*)")
        .eq("conversation_id", conversationId);
      if (error) throw error;
      return data;
    },
  });

  const assignedLabelIds = assignedLabels?.map(a => a.label_id) || [];

  // Create new label
  const createLabel = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("conversation_labels")
        .insert({
          name: newLabelName,
          color: selectedColor,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversation-labels"] });
      setNewLabelName("");
      toast.success("Label created");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Toggle label assignment
  const toggleLabel = useMutation({
    mutationFn: async (labelId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const isAssigned = assignedLabelIds.includes(labelId);

      if (isAssigned) {
        const { error } = await supabase
          .from("conversation_label_assignments")
          .delete()
          .eq("conversation_id", conversationId)
          .eq("label_id", labelId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("conversation_label_assignments")
          .insert({
            conversation_id: conversationId,
            label_id: labelId,
            assigned_by: user.id,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ["conversation-label-assignments", conversationId] 
      });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Delete label
  const deleteLabel = useMutation({
    mutationFn: async (labelId: string) => {
      const { error } = await supabase
        .from("conversation_labels")
        .delete()
        .eq("id", labelId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversation-labels"] });
      queryClient.invalidateQueries({ 
        queryKey: ["conversation-label-assignments", conversationId] 
      });
      toast.success("Label deleted");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  return (
    <div className="flex items-center gap-2">
      {/* Display assigned labels */}
      {assignedLabels?.map((assignment) => (
        <Badge
          key={assignment.id}
          style={{ backgroundColor: assignment.label?.color }}
          className="text-white gap-1"
        >
          {assignment.label?.name}
          <button
            onClick={() => toggleLabel.mutate(assignment.label_id)}
            className="hover:bg-white/20 rounded-full p-0.5"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}

      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-1">
            <Tag className="h-4 w-4" />
            <span className="hidden sm:inline">Labels</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64" align="start">
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Labels</h4>

            {/* Existing labels */}
            <div className="space-y-1 max-h-40 overflow-auto">
              {allLabels?.map((label) => (
                <div
                  key={label.id}
                  className="flex items-center justify-between p-2 rounded hover:bg-muted cursor-pointer group"
                  onClick={() => toggleLabel.mutate(label.id)}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: label.color }}
                    />
                    <span className="text-sm">{label.name}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {assignedLabelIds.includes(label.id) && (
                      <Check className="h-4 w-4 text-primary" />
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteLabel.mutate(label.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Create new label */}
            <div className="border-t pt-3 space-y-2">
              <Input
                placeholder="New label name"
                value={newLabelName}
                onChange={(e) => setNewLabelName(e.target.value)}
                className="h-8"
              />
              <div className="flex items-center gap-1">
                {LABEL_COLORS.map((color) => (
                  <button
                    key={color}
                    className={cn(
                      "w-5 h-5 rounded-full transition-transform",
                      selectedColor === color && "ring-2 ring-offset-2 ring-primary"
                    )}
                    style={{ backgroundColor: color }}
                    onClick={() => setSelectedColor(color)}
                  />
                ))}
              </div>
              <Button
                size="sm"
                className="w-full gap-1"
                disabled={!newLabelName.trim()}
                onClick={() => createLabel.mutate()}
              >
                <Plus className="h-4 w-4" />
                Create Label
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
