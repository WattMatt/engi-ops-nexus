import { useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface CompletionPromptData {
  roadmapItemId: string;
  roadmapItemTitle: string;
}

export const useRoadmapCompletionCheck = () => {
  const [promptData, setPromptData] = useState<CompletionPromptData | null>(null);
  const [isPromptOpen, setIsPromptOpen] = useState(false);

  const checkAndPromptCompletion = useCallback(async (
    taskId: string,
    newStatus: string,
    roadmapItemId: string | null
  ) => {
    // Only check when task is being completed and has a roadmap link
    if (newStatus !== "completed" || !roadmapItemId) {
      return;
    }

    try {
      // Check if all tasks for this roadmap item are now completed
      const { data: tasks, error } = await supabase
        .from("site_diary_tasks")
        .select("id, status")
        .eq("roadmap_item_id", roadmapItemId);

      if (error) throw error;

      const allCompleted = tasks?.every((task) => 
        task.id === taskId ? true : task.status === "completed"
      );

      if (allCompleted && tasks && tasks.length > 0) {
        // Fetch roadmap item details
        const { data: roadmapItem } = await supabase
          .from("project_roadmap_items")
          .select("id, title, is_completed")
          .eq("id", roadmapItemId)
          .single();

        // Only prompt if roadmap item is not already completed
        if (roadmapItem && !roadmapItem.is_completed) {
          setPromptData({
            roadmapItemId: roadmapItem.id,
            roadmapItemTitle: roadmapItem.title,
          });
          setIsPromptOpen(true);
        }
      }
    } catch (error) {
      console.error("Error checking roadmap completion:", error);
    }
  }, []);

  const closePrompt = useCallback(() => {
    setIsPromptOpen(false);
    setPromptData(null);
  }, []);

  return {
    promptData,
    isPromptOpen,
    checkAndPromptCompletion,
    closePrompt,
  };
};
