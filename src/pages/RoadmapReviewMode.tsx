import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Send, X, ClipboardCheck, Map as MapIcon, ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { RoadmapItem } from "@/components/dashboard/roadmap/RoadmapItem";
import { ReviewCompletionDialog } from "@/components/dashboard/roadmap/ReviewCompletionDialog";
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
  priority: string | null;
  link_url: string | null;
  link_label: string | null;
  comments: string | null;
  start_date: string | null;
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

interface ItemUpdate {
  itemId: string;
  title: string;
  wasCompleted: boolean;
  isNowCompleted: boolean;
  notes?: string;
}

export default function RoadmapReviewMode() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [projectId, setProjectId] = useState<string | null>(null);
  const [reviewSessionId, setReviewSessionId] = useState<string | null>(null);
  const [itemUpdates, setItemUpdates] = useState<Map<string, ItemUpdate>>(new Map());
  const [completionDialogOpen, setCompletionDialogOpen] = useState(false);
  const [projectName, setProjectName] = useState<string>("");
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set(["all"]));

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

  useEffect(() => {
    const storedProjectId = localStorage.getItem("selectedProjectId");
    if (storedProjectId) {
      setProjectId(storedProjectId);
    } else {
      navigate("/projects");
    }
  }, [navigate]);

  // Fetch project details
  const { data: project } = useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("name")
        .eq("id", projectId)
        .single();
      if (error) throw error;
      setProjectName(data.name);
      return data;
    },
    enabled: !!projectId,
  });

  // Fetch roadmap items
  const { data: items = [], isLoading } = useQuery({
    queryKey: ["roadmap-items-review", projectId],
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

  // Create review session
  const createSession = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("roadmap_review_sessions")
        .insert({
          project_id: projectId,
          started_by: user.id,
          status: "in_progress",
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setReviewSessionId(data.id);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to start review session");
    },
  });

  // Start session on mount
  useEffect(() => {
    if (projectId && !reviewSessionId) {
      createSession.mutate();
    }
  }, [projectId]);

  // Toggle item completion - track for review
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
      return { id, isCompleted };
    },
    onSuccess: ({ id, isCompleted }) => {
      // Track the update for review
      const item = items.find(i => i.id === id);
      if (item) {
        const update: ItemUpdate = {
          itemId: item.id,
          title: item.title,
          wasCompleted: item.is_completed,
          isNowCompleted: isCompleted,
        };
        setItemUpdates(prev => {
          const next = new Map(prev);
          next.set(item.id, update);
          return next;
        });
      }
      queryClient.invalidateQueries({ queryKey: ["roadmap-items-review", projectId] });
      toast.success("Item updated");
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
      queryClient.invalidateQueries({ queryKey: ["roadmap-items-review", projectId] });
    },
  });

  const updateDate = useMutation({
    mutationFn: async ({ id, field, value }: { id: string; field: "start_date" | "due_date"; value: string | null }) => {
      const { error } = await supabase
        .from("project_roadmap_items")
        .update({ [field]: value })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roadmap-items-review", projectId] });
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

  const handleCancel = async () => {
    if (reviewSessionId) {
      await supabase
        .from("roadmap_review_sessions")
        .update({ status: "cancelled" })
        .eq("id", reviewSessionId);
    }
    navigate("/dashboard/roadmap");
  };

  const handleComplete = () => {
    if (itemUpdates.size === 0) {
      toast.info("No items have been updated during this review");
      return;
    }
    setCompletionDialogOpen(true);
  };

  // Group items by phase
  const phases = [...new Set(items.filter(i => !i.parent_id).map(i => i.phase || "General"))];
  const rootItems = items.filter(i => !i.parent_id);
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
  const updatedCount = itemUpdates.size;

  if (!projectId) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header - matches ProjectRoadmap layout */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <ClipboardCheck className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Project Roadmap - Review Mode</h1>
          </div>
          <p className="text-muted-foreground">
            {projectName} • Review and update items, then send consolidated updates
          </p>
        </div>
        <div className="flex items-center gap-2">
          {updatedCount > 0 && (
            <Badge variant="secondary" className="gap-1">
              {updatedCount} item{updatedCount !== 1 ? "s" : ""} updated
            </Badge>
          )}
          <Button variant="outline" size="sm" onClick={handleCancel}>
            <X className="h-4 w-4 mr-2" />
            Exit Review
          </Button>
          <Button size="sm" onClick={handleComplete} disabled={updatedCount === 0}>
            <Send className="h-4 w-4 mr-2" />
            Complete & Send Update
          </Button>
        </div>
      </div>

      {/* Roadmap Card with Review Mode Border - exact same structure as ProjectRoadmapWidget */}
      <Card className="border-2 border-primary shadow-[0_0_15px_-3px_hsl(var(--primary)/0.4)]">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2 text-base">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <MapIcon className="h-4 w-4 text-primary" />
            </div>
            Project Roadmap
            <Badge variant="outline" className="ml-2 bg-primary/10 text-primary border-primary/30">
              Review Mode
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {completedCount}/{items.length} completed ({progress}%)
            </span>
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
              <MapIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm font-medium">No roadmap items to review</p>
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
                                onEdit={() => {}} // Disabled in review mode
                                onDelete={() => {}} // Disabled in review mode
                                onAddChild={() => {}} // Disabled in review mode
                                onReorderChildren={(updates) => reorderItems.mutate(updates)}
                                onDateChange={(id, field, value) => updateDate.mutate({ id, field, value })}
                                showDateColumns
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

      {/* Completion Dialog */}
      <ReviewCompletionDialog
        open={completionDialogOpen}
        onOpenChange={setCompletionDialogOpen}
        projectId={projectId}
        projectName={projectName}
        reviewSessionId={reviewSessionId || ""}
        itemUpdates={Array.from(itemUpdates.values())}
        onComplete={() => navigate("/dashboard/roadmap")}
      />
    </div>
  );
}
