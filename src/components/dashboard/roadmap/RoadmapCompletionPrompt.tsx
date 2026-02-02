import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Trophy } from "lucide-react";
import { toast } from "sonner";
import confetti from "canvas-confetti";

interface RoadmapCompletionPromptProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roadmapItemId: string;
  roadmapItemTitle: string;
  projectId: string;
}

export const RoadmapCompletionPrompt = ({
  open,
  onOpenChange,
  roadmapItemId,
  roadmapItemTitle,
  projectId,
}: RoadmapCompletionPromptProps) => {
  const queryClient = useQueryClient();

  // Fetch task stats for confirmation
  const { data: taskStats } = useQuery({
    queryKey: ["completion-prompt-stats", roadmapItemId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_diary_tasks")
        .select("id, status")
        .eq("roadmap_item_id", roadmapItemId);

      if (error) throw error;

      const total = data?.length || 0;
      const completed = data?.filter((t) => t.status === "completed").length || 0;

      return { total, completed };
    },
    enabled: open,
  });

  const completeRoadmapItem = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from("project_roadmap_items")
        .update({
          is_completed: true,
          completed_at: new Date().toISOString(),
          completed_by: user?.id,
        })
        .eq("id", roadmapItemId);

      if (error) throw error;
    },
    onSuccess: () => {
      // Celebrate!
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
      
      toast.success("Roadmap milestone marked as complete! 🎉");
      queryClient.invalidateQueries({ queryKey: ["roadmap-items", projectId] });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to complete roadmap item");
    },
  });

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            All Tasks Completed!
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-4">
            <p>
              All linked tasks for <strong>"{roadmapItemTitle}"</strong> have been completed.
            </p>
            
            {taskStats && (
              <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <span className="text-sm text-green-700 dark:text-green-300">
                  {taskStats.completed} of {taskStats.total} tasks completed
                </span>
                <Badge variant="outline" className="ml-auto bg-green-100 text-green-700 border-green-300">
                  100%
                </Badge>
              </div>
            )}

            <p className="text-sm">
              Would you like to mark this roadmap milestone as complete?
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Not Yet</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => completeRoadmapItem.mutate()}
            disabled={completeRoadmapItem.isPending}
            className="bg-green-600 hover:bg-green-700"
          >
            {completeRoadmapItem.isPending ? "Completing..." : "Mark Complete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
