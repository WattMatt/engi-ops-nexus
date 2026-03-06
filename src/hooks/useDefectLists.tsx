import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface DefectList {
  id: string;
  project_id: string;
  name: string;
  created_by_name: string | null;
  created_by_email: string | null;
  created_at: string;
}

export const useDefectLists = (projectId: string) => {
  return useQuery({
    queryKey: ["defect-lists", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("defect_lists")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as DefectList[];
    },
    enabled: !!projectId,
  });
};

export const useCreateDefectList = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      project_id,
      name,
      created_by_name,
      created_by_email,
    }: {
      project_id: string;
      name: string;
      created_by_name?: string;
      created_by_email?: string;
    }) => {
      const { data, error } = await supabase
        .from("defect_lists")
        .insert({ project_id, name, created_by_name, created_by_email })
        .select()
        .single();
      if (error) throw error;
      return data as DefectList;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["defect-lists", data.project_id] });
      toast.success("Observation list created");
    },
    onError: (err: Error) => {
      toast.error("Failed to create list: " + err.message);
    },
  });
};
