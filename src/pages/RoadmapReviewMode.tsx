import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, CheckCircle2, Circle, Send, X, ClipboardCheck } from "lucide-react";
import { toast } from "sonner";
import { ReviewItemCard } from "@/components/dashboard/roadmap/ReviewItemCard";
import { ReviewCompletionDialog } from "@/components/dashboard/roadmap/ReviewCompletionDialog";

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
  priority: string | null;
  link_url: string | null;
  link_label: string | null;
  comments: string | null;
  start_date: string | null;
  due_date: string | null;
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
      toast.success("Review session started");
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

  // Toggle item completion
  const toggleItem = useMutation({
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
      queryClient.invalidateQueries({ queryKey: ["roadmap-items-review", projectId] });
    },
  });

  const handleToggleItem = (item: RoadmapItemData, newStatus: boolean, notes?: string) => {
    // Track the update
    const update: ItemUpdate = {
      itemId: item.id,
      title: item.title,
      wasCompleted: item.is_completed,
      isNowCompleted: newStatus,
      notes,
    };
    
    setItemUpdates(prev => {
      const next = new Map(prev);
      next.set(item.id, update);
      return next;
    });

    // Update the database
    toggleItem.mutate({ id: item.id, isCompleted: newStatus });
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

  const completedCount = items.filter(i => i.is_completed).length;
  const progress = items.length > 0 ? Math.round((completedCount / items.length) * 100) : 0;
  const updatedCount = itemUpdates.size;

  if (!projectId) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <Skeleton className="h-12 w-64 mb-6" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b">
        <div className="container mx-auto py-4 px-4 max-w-4xl">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={handleCancel}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <div className="flex items-center gap-2">
                  <ClipboardCheck className="h-5 w-5 text-primary" />
                  <h1 className="text-xl font-semibold">Roadmap Review Mode</h1>
                </div>
                <p className="text-sm text-muted-foreground">{projectName}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {updatedCount > 0 && (
                <Badge variant="secondary" className="gap-1">
                  {updatedCount} item{updatedCount !== 1 ? "s" : ""} updated
                </Badge>
              )}
              <Button variant="outline" onClick={handleCancel}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button onClick={handleComplete} disabled={updatedCount === 0}>
                <Send className="h-4 w-4 mr-2" />
                Complete & Send Update
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Progress */}
      <div className="container mx-auto py-4 px-4 max-w-4xl">
        <Card className="mb-6">
          <CardContent className="py-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Overall Progress</span>
              <span className="text-sm text-muted-foreground">
                {completedCount}/{items.length} completed ({progress}%)
              </span>
            </div>
            <Progress value={progress} className="h-2" />
          </CardContent>
        </Card>

        {/* Items by Phase */}
        <div className="space-y-6">
          {phases.map((phase) => {
            const phaseItems = rootItems.filter(i => (i.phase || "General") === phase);
            const phaseCompleted = phaseItems.filter(i => i.is_completed).length;

            return (
              <Card key={phase}>
                <CardHeader className="py-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{phase}</CardTitle>
                    <Badge variant="outline">
                      {phaseCompleted}/{phaseItems.length}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="py-0 pb-4">
                  <div className="space-y-2">
                    {phaseItems.map((item) => (
                      <ReviewItemCard
                        key={item.id}
                        item={item}
                        children={childrenByParent[item.id] || []}
                        allChildrenByParent={childrenByParent}
                        onToggle={handleToggleItem}
                        isUpdated={itemUpdates.has(item.id)}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

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
