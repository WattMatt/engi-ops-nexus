import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface StreakData {
  current_streak: number;
  longest_streak: number;
  total_completions: number;
  last_completion_date: string | null;
}

interface StreakUpdateResult {
  current_streak: number;
  longest_streak: number;
  total_completions: number;
  is_new_record: boolean;
}

export function useCompletionStreak(projectId: string | null) {
  const queryClient = useQueryClient();

  const { data: streak, isLoading } = useQuery({
    queryKey: ["completion-streak", projectId],
    queryFn: async (): Promise<StreakData | null> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !projectId) return null;

      const { data, error } = await supabase
        .from("roadmap_completion_streaks")
        .select("current_streak, longest_streak, total_completions, last_completion_date")
        .eq("user_id", user.id)
        .eq("project_id", projectId)
        .maybeSingle();

      if (error) {
        console.error("Error fetching streak:", error);
        return null;
      }

      return data;
    },
    enabled: !!projectId,
  });

  const updateStreak = useMutation({
    mutationFn: async (): Promise<StreakUpdateResult | null> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !projectId) return null;

      const { data, error } = await supabase.rpc("update_completion_streak", {
        p_user_id: user.id,
        p_project_id: projectId,
      });

      if (error) {
        console.error("Error updating streak:", error);
        throw error;
      }

      // The RPC returns an array with a single row
      return data?.[0] || null;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["completion-streak", projectId] });
      return result;
    },
  });

  return {
    streak,
    isLoading,
    updateStreak,
  };
}
