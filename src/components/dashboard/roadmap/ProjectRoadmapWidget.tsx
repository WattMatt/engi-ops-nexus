import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Map, ChevronDown, ChevronRight, FileDown } from "lucide-react";
import { toast } from "sonner";
import { RoadmapItem } from "./RoadmapItem";
import { AddRoadmapItemDialog } from "./AddRoadmapItemDialog";
import { defaultRoadmapTemplate } from "./roadmapTemplates";

interface ProjectRoadmapWidgetProps {
  projectId: string;
}

interface RoadmapItemData {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  phase: string | null;
  parent_id: string | null;
  sort_order: number;
  is_completed: boolean;
  completed_at: string | null;
  completed_by: string | null;
  link_url: string | null;
  link_label: string | null;
  comments: string | null;
  due_date: string | null;
  priority: string | null;
  created_at: string;
  updated_at: string;
}

export const ProjectRoadmapWidget = ({ projectId }: ProjectRoadmapWidgetProps) => {
  const queryClient = useQueryClient();
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set(["all"]));
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<RoadmapItemData | null>(null);
  const [parentId, setParentId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["roadmap-items", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_roadmap_items")
        .select("*")
        .eq("project_id", projectId)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data as RoadmapItemData[];
    },
    enabled: !!projectId,
  });

  const loadTemplateMutation = useMutation({
    mutationFn: async () => {
      // Insert all parent items first
      const parentItems = defaultRoadmapTemplate.map((item) => ({
        project_id: projectId,
        title: item.title,
        phase: item.phase,
        sort_order: item.sort_order,
        is_completed: false,
      }));

      const { data: insertedParents, error: parentError } = await supabase
        .from("project_roadmap_items")
        .insert(parentItems)
        .select();

      if (parentError) throw parentError;

      // Now insert children with parent references
      const childItems: any[] = [];
      defaultRoadmapTemplate.forEach((templateItem, index) => {
        if (templateItem.children && insertedParents[index]) {
          templateItem.children.forEach((child) => {
            childItems.push({
              project_id: projectId,
              parent_id: insertedParents[index].id,
              title: child.title,
              phase: null,
              sort_order: child.sort_order,
              is_completed: false,
            });
          });
        }
      });

      if (childItems.length > 0) {
        const { error: childError } = await supabase
          .from("project_roadmap_items")
          .insert(childItems);
        if (childError) throw childError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roadmap-items", projectId] });
      toast.success("Baseline roadmap loaded successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to load template");
    },
  });

  const toggleComplete = useMutation({
    mutationFn: async ({ id, isCompleted }: { id: string; isCompleted: boolean }) => {
      const { error } = await supabase
        .from("project_roadmap_items")
        .update({
          is_completed: isCompleted,
          completed_at: isCompleted ? new Date().toISOString() : null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roadmap-items", projectId] });
      toast.success("Item updated");
    },
  });

  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("project_roadmap_items")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roadmap-items", projectId] });
      toast.success("Item deleted");
    },
  });

  const reorderItems = useMutation({
    mutationFn: async (updates: { id: string; sort_order: number }[]) => {
      for (const update of updates) {
        const { error } = await supabase
          .from("project_roadmap_items")
          .update({ sort_order: update.sort_order })
          .eq("id", update.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roadmap-items", projectId] });
    },
  });

  const handleDragEnd = (event: DragEndEvent, itemList: RoadmapItemData[]) => {
    const { active, over } = event;
    
    if (!over || active.id === over.id) return;

    const oldIndex = itemList.findIndex((item) => item.id === active.id);
    const newIndex = itemList.findIndex((item) => item.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const reorderedItems = [...itemList];
    const [movedItem] = reorderedItems.splice(oldIndex, 1);
    reorderedItems.splice(newIndex, 0, movedItem);

    const updates = reorderedItems.map((item, index) => ({
      id: item.id,
      sort_order: index,
    }));

    reorderItems.mutate(updates);
  };

  const togglePhase = (phase: string) => {
    setExpandedPhases((prev) => {
      const next = new Set(prev);
      if (next.has(phase)) {
        next.delete(phase);
      } else {
        next.add(phase);
      }
      return next;
    });
  };

  const handleAddItem = (parentId: string | null = null) => {
    setParentId(parentId);
    setEditingItem(null);
    setAddDialogOpen(true);
  };

  const handleEditItem = (item: RoadmapItemData) => {
    setEditingItem(item);
    setParentId(item.parent_id);
    setAddDialogOpen(true);
  };

  // Group items by phase, with children nested under parents
  const phases = [...new Set(items.filter(i => !i.parent_id).map(i => i.phase || "General"))];
  const rootItems = items.filter(i => !i.parent_id);
  
  // Build a map of all children by parent_id - this includes all levels
  const childrenByParent = items.reduce((acc, item) => {
    if (item.parent_id) {
      if (!acc[item.parent_id]) acc[item.parent_id] = [];
      acc[item.parent_id].push(item);
    }
    return acc;
  }, {} as Record<string, RoadmapItemData[]>);
  
  // Sort children by sort_order
  Object.keys(childrenByParent).forEach(key => {
    childrenByParent[key].sort((a, b) => a.sort_order - b.sort_order);
  });

  const completedCount = items.filter(i => i.is_completed).length;
  const progress = items.length > 0 ? Math.round((completedCount / items.length) * 100) : 0;

  if (isLoading) {
    return (
      <Card className="border-border/50 shadow-sm">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-40" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-border/50 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2 text-base">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Map className="h-4 w-4 text-primary" />
            </div>
            Project Roadmap
          </CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {completedCount}/{items.length} completed ({progress}%)
            </span>
            <Button size="sm" onClick={() => handleAddItem(null)}>
              <Plus className="h-4 w-4 mr-1" />
              Add Item
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Progress bar */}
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>

          {items.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Map className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm font-medium">No roadmap items yet</p>
              <p className="text-xs mt-1 mb-4">Start with our baseline project roadmap or add your own items</p>
              <Button 
                onClick={() => loadTemplateMutation.mutate()} 
                disabled={loadTemplateMutation.isPending}
                className="gap-2"
              >
                <FileDown className="h-4 w-4" />
                {loadTemplateMutation.isPending ? "Loading..." : "Load Baseline Roadmap"}
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {phases.map((phase) => {
                const phaseItems = rootItems.filter(i => (i.phase || "General") === phase);
                const isExpanded = expandedPhases.has(phase) || expandedPhases.has("all");

                return (
                  <div key={phase} className="border rounded-lg overflow-hidden">
                    <button
                      onClick={() => togglePhase(phase)}
                      className="w-full flex items-center justify-between px-4 py-2 bg-muted/50 hover:bg-muted/80 transition-colors text-left"
                    >
                      <div className="flex items-center gap-2">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                        <span className="font-medium text-sm">{phase}</span>
                        <span className="text-xs text-muted-foreground">
                          ({phaseItems.filter(i => i.is_completed).length}/{phaseItems.length})
                        </span>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddItem(null);
                        }}
                        className="h-6 px-2"
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </button>

                    {isExpanded && (
                      <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={(event) => handleDragEnd(event, phaseItems)}
                      >
                        <SortableContext
                          items={phaseItems.map((item) => item.id)}
                          strategy={verticalListSortingStrategy}
                        >
                          <div className="p-2 space-y-1">
                            {phaseItems.map((item) => (
                              <RoadmapItem
                                key={item.id}
                                item={item}
                                children={childrenByParent[item.id] || []}
                                allChildrenByParent={childrenByParent}
                                projectId={projectId}
                                onToggleComplete={(id, isCompleted) => 
                                  toggleComplete.mutate({ id, isCompleted })
                                }
                                onEdit={handleEditItem}
                                onDelete={(id) => deleteItem.mutate(id)}
                                onAddChild={(parentId) => handleAddItem(parentId)}
                                onReorderChildren={(updates) => reorderItems.mutate(updates)}
                              />
                            ))}
                          </div>
                        </SortableContext>
                      </DndContext>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <AddRoadmapItemDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        projectId={projectId}
        parentId={parentId}
        editingItem={editingItem}
      />
    </>
  );
};
