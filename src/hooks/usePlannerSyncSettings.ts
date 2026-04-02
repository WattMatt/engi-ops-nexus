import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface PlannerSyncSettings {
  id: string;
  enabled: boolean;
  sync_direction: "bidirectional" | "planner_to_nexus" | "nexus_to_planner";
  sync_frequency_minutes: number;
  push_frequency_minutes: number;
  handle_recurring_tasks: "skip" | "process";
  last_modified_by: string | null;
  created_at: string;
  updated_at: string;
}

export function usePlannerSyncSettings() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["planner-sync-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("planner_sync_settings" as any)
        .select("*")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as PlannerSyncSettings | null;
    },
  });

  const mutation = useMutation({
    mutationFn: async (updates: Partial<PlannerSyncSettings>) => {
      const { data: user } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("planner_sync_settings" as any)
        .update({ ...updates, last_modified_by: user.user?.id } as any)
        .eq("id", query.data?.id as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["planner-sync-settings"] });
      toast.success("Planner sync settings updated");
    },
    onError: (err: Error) => {
      toast.error("Failed to update settings: " + err.message);
    },
  });

  return { settings: query.data, isLoading: query.isLoading, updateSettings: mutation.mutate, isUpdating: mutation.isPending };
}
