import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useHandoverLinkStatus = (projectId: string) => {
  return useQuery({
    queryKey: ["handover-link-status", projectId],
    queryFn: async () => {
      // Fetch all handover documents that were linked from tenants
      const { data, error } = await supabase
        .from("handover_documents")
        .select("source_id")
        .eq("project_id", projectId)
        .eq("source_type", "tenant_link");

      if (error) throw error;

      // Extract unique tenant IDs from source_id
      const linkedTenantIds = new Set<string>();
      
      data?.forEach((doc) => {
        if (doc.source_id) {
          linkedTenantIds.add(doc.source_id);
        }
      });

      return {
        linkedTenantIds: Array.from(linkedTenantIds),
        totalLinked: linkedTenantIds.size,
      };
    },
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });
};
