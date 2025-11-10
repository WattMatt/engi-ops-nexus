import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useHandoverLinkStatus = (projectId: string) => {
  return useQuery({
    queryKey: ["handover-link-status", projectId],
    queryFn: async () => {
      // Fetch all handover documents that were linked from tenants
      const { data, error } = await supabase
        .from("handover_documents" as any)
        .select("metadata")
        .eq("project_id", projectId)
        .eq("source_type", "tenant_link");

      if (error) throw error;

      // Extract unique tenant IDs from metadata
      const linkedTenantIds = new Set<string>();
      
      data?.forEach((doc: any) => {
        if (doc.metadata?.tenant_id) {
          linkedTenantIds.add(doc.metadata.tenant_id);
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
