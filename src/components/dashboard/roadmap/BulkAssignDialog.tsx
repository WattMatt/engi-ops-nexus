import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Users, CheckSquare, Send, Loader2 } from "lucide-react";

interface RoadmapItemData {
  id: string;
  title: string;
  phase: string | null;
  parent_id: string | null;
  is_completed: boolean;
  assigned_to: string | null;
  due_date: string | null;
  priority: string | null;
}

interface TeamMember {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: string;
}

interface BulkAssignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
}

export const BulkAssignDialog = ({
  open,
  onOpenChange,
  projectId,
}: BulkAssignDialogProps) => {
  const queryClient = useQueryClient();
  const [selectedMemberId, setSelectedMemberId] = useState<string>("");
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [sendNotification, setSendNotification] = useState(true);

  // Fetch project team members
  const { data: teamMembers = [], isLoading: loadingMembers } = useQuery({
    queryKey: ["project-members", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_members")
        .select(`
          id,
          position,
          user_id,
          profiles:user_id (
            id,
            full_name,
            email
          )
        `)
        .eq("project_id", projectId);

      if (error) throw error;
      return data.map((m) => ({
        id: m.id,
        userId: m.user_id,
        name: (m.profiles as any)?.full_name || (m.profiles as any)?.email || "Unknown",
        email: (m.profiles as any)?.email || "",
        role: m.position || "Team Member",
      })) as TeamMember[];
    },
    enabled: open,
  });

  // Fetch roadmap items
  const { data: roadmapItems = [], isLoading: loadingItems } = useQuery({
    queryKey: ["roadmap-items", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_roadmap_items")
        .select("id, title, phase, parent_id, is_completed, assigned_to, due_date, priority")
        .eq("project_id", projectId)
        .order("sort_order", { ascending: true });

      if (error) throw error;
      return data as RoadmapItemData[];
    },
    enabled: open,
  });

  // Get all items (don't pre-filter, show everything for full visibility)
  const allItems = useMemo(() => {
    return roadmapItems.filter((item) => !item.is_completed);
  }, [roadmapItems]);

  // Get top-level phases (items without parent_id)
  const phases = useMemo(() => {
    return roadmapItems.filter((item) => !item.parent_id);
  }, [roadmapItems]);

  // Group child items by their parent phase
  const itemsByPhase = useMemo(() => {
    const grouped: Record<string, { phase: RoadmapItemData; items: RoadmapItemData[] }> = {};
    
    // First, create entries for each phase
    phases.forEach((phase) => {
      grouped[phase.id] = { phase, items: [] };
    });
    
    // Then, assign child items to their parent phases
    roadmapItems.forEach((item) => {
      if (item.parent_id && grouped[item.parent_id] && !item.is_completed) {
        grouped[item.parent_id].items.push(item);
      }
    });
    
    // Also handle items that are phases themselves but incomplete (can be assigned)
    phases.forEach((phase) => {
      if (!phase.is_completed && !grouped[phase.id].items.some(i => i.id === phase.id)) {
        // Phase itself can be an assignable item if not completed
      }
    });
    
    return grouped;
  }, [roadmapItems, phases]);

  // Get flat list for select all / count
  const assignableItems = useMemo(() => {
    const items: RoadmapItemData[] = [];
    Object.values(itemsByPhase).forEach(({ phase, items: children }) => {
      // Include the phase itself if it's not completed
      if (!phase.is_completed) {
        items.push(phase);
      }
      items.push(...children);
    });
    return items;
  }, [itemsByPhase]);

  const bulkAssignMutation = useMutation({
    mutationFn: async () => {
      if (!selectedMemberId || selectedItemIds.size === 0) {
        throw new Error("Please select a team member and at least one item");
      }

      // Update all selected items
      const { error } = await supabase
        .from("project_roadmap_items")
        .update({ assigned_to: selectedMemberId })
        .in("id", Array.from(selectedItemIds));

      if (error) throw error;

      // Send notification if enabled
      if (sendNotification) {
        const member = teamMembers.find((m) => m.id === selectedMemberId);
        const items = roadmapItems.filter((i) => selectedItemIds.has(i.id));

        try {
          await supabase.functions.invoke("send-roadmap-assignment-notification", {
            body: {
              projectId,
              assigneeEmail: member?.email,
              assigneeName: member?.name,
              items: items.map((i) => ({
                id: i.id,
                title: i.title,
                phase: i.phase,
                dueDate: i.due_date,
                priority: i.priority,
              })),
            },
          });
        } catch (emailError) {
          console.error("Failed to send assignment notification:", emailError);
          // Don't throw - email failure shouldn't block the assignment
        }
      }

      return { count: selectedItemIds.size };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["roadmap-items", projectId] });
      queryClient.invalidateQueries({ queryKey: ["roadmap-review-content"] });
      toast.success(`${data.count} item(s) assigned successfully`);
      handleClose();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to assign items");
    },
  });

  const handleClose = () => {
    setSelectedMemberId("");
    setSelectedItemIds(new Set());
    setSendNotification(true);
    onOpenChange(false);
  };

  const toggleItem = (itemId: string) => {
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  const togglePhase = (phaseId: string) => {
    const phaseData = itemsByPhase[phaseId];
    if (!phaseData) return;
    
    // Get all items for this phase (phase itself + children)
    const allPhaseItems = [phaseData.phase, ...phaseData.items].filter(i => !i.is_completed);
    const allSelected = allPhaseItems.every((item) => selectedItemIds.has(item.id));

    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      allPhaseItems.forEach((item) => {
        if (allSelected) {
          next.delete(item.id);
        } else {
          next.add(item.id);
        }
      });
      return next;
    });
  };

  const selectAll = () => {
    setSelectedItemIds(new Set(assignableItems.map((item) => item.id)));
  };

  const clearAll = () => {
    setSelectedItemIds(new Set());
  };

  const selectedMember = teamMembers.find((m) => m.id === selectedMemberId);
  const isLoading = loadingMembers || loadingItems;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Bulk Assign Roadmap Items
          </DialogTitle>
          <DialogDescription>
            Select a team member and choose items to assign to them. They'll receive an email notification with the assignment details.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4 py-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : (
          <div className="flex-1 space-y-4 overflow-hidden">
            {/* Team Member Selection */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Assign To</Label>
              <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select team member" />
                </SelectTrigger>
                <SelectContent>
                  {teamMembers.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                          {member.name.charAt(0).toUpperCase()}
                        </div>
                        <span>{member.name}</span>
                        <span className="text-muted-foreground text-xs">({member.role})</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {teamMembers.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No team members found. Add team members in Project Settings.
                </p>
              )}
            </div>

            {/* Item Selection */}
            {selectedMemberId && (
              <div className="space-y-2 flex-1 overflow-hidden flex flex-col">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">
                    Select Items to Assign
                    {selectedItemIds.size > 0 && (
                      <Badge variant="secondary" className="ml-2">
                        {selectedItemIds.size} selected
                      </Badge>
                    )}
                  </Label>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={selectAll}>
                      Select All
                    </Button>
                    <Button variant="ghost" size="sm" onClick={clearAll}>
                      Clear
                    </Button>
                  </div>
                </div>

                <ScrollArea className="flex-1 max-h-[300px] border rounded-md">
                  <div className="p-3 space-y-4">
                    {Object.entries(itemsByPhase).map(([phaseId, { phase, items }]) => {
                      // All items for this phase (phase + children, excluding completed)
                      const allPhaseItems = [phase, ...items].filter(i => !i.is_completed);
                      const allSelected = allPhaseItems.length > 0 && allPhaseItems.every((item) => selectedItemIds.has(item.id));
                      const someSelected = allPhaseItems.some((item) => selectedItemIds.has(item.id));

                      return (
                        <div key={phaseId} className="space-y-2">
                          <div
                            className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-1 rounded"
                            onClick={() => togglePhase(phaseId)}
                          >
                            <Checkbox
                              checked={allSelected}
                              className={someSelected && !allSelected ? "opacity-50" : ""}
                            />
                            <span className="font-medium text-sm">{phase.title}</span>
                            <span className="text-xs text-muted-foreground">
                              ({allPhaseItems.length} items)
                            </span>
                            {phase.is_completed && (
                              <Badge variant="secondary" className="text-xs">Completed</Badge>
                            )}
                          </div>
                          <div className="ml-6 space-y-1">
                            {items.filter(i => !i.is_completed).map((item) => (
                              <div
                                key={item.id}
                                className="flex items-center gap-2 cursor-pointer hover:bg-muted/30 p-2 rounded text-sm"
                                onClick={() => toggleItem(item.id)}
                              >
                                <Checkbox checked={selectedItemIds.has(item.id)} />
                                <span className="flex-1 truncate">{item.title}</span>
                                {item.priority && (
                                  <Badge
                                    variant="outline"
                                    className={
                                      item.priority === "critical"
                                        ? "border-destructive text-destructive"
                                        : item.priority === "high"
                                        ? "border-orange-500 text-orange-600"
                                        : item.priority === "medium"
                                        ? "border-yellow-500 text-yellow-600"
                                        : "border-primary text-primary"
                                    }
                                  >
                                    {item.priority}
                                  </Badge>
                                )}
                                {item.assigned_to && (
                                  <Badge variant="secondary" className="text-xs">
                                    Assigned
                                  </Badge>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}

                    {assignableItems.length === 0 && (
                      <p className="text-center text-muted-foreground py-4 text-sm">
                        No incomplete items available to assign
                      </p>
                    )}
                  </div>
                </ScrollArea>
              </div>
            )}

            {/* Notification Toggle */}
            {selectedMemberId && selectedItemIds.size > 0 && (
              <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                <Checkbox
                  id="sendNotification"
                  checked={sendNotification}
                  onCheckedChange={(checked) => setSendNotification(!!checked)}
                />
                <Label htmlFor="sendNotification" className="text-sm cursor-pointer flex items-center gap-2">
                  <Send className="h-4 w-4" />
                  Send email notification to {selectedMember?.name}
                </Label>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={() => bulkAssignMutation.mutate()}
            disabled={!selectedMemberId || selectedItemIds.size === 0 || bulkAssignMutation.isPending}
          >
            {bulkAssignMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Assigning...
              </>
            ) : (
              <>
                <CheckSquare className="h-4 w-4 mr-2" />
                Assign {selectedItemIds.size} Item(s)
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
