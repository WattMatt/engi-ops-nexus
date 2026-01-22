import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface ProjectClientStatus {
  hasClient: boolean;
  isLoading: boolean;
  clientContact: {
    id: string;
    organization_name: string;
    contact_person_name: string | null;
    logo_url: string | null;
  } | null;
}

export function useProjectClientCheck(projectId: string | null): ProjectClientStatus {
  const { data, isLoading } = useQuery({
    queryKey: ["project-client-check", projectId],
    queryFn: async () => {
      if (!projectId) return null;

      const { data, error } = await supabase
        .from("project_contacts")
        .select("id, organization_name, contact_person_name, logo_url")
        .eq("project_id", projectId)
        .eq("contact_type", "client")
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("Error checking project client:", error);
        return null;
      }

      return data;
    },
    enabled: !!projectId,
  });

  return {
    hasClient: !!data,
    isLoading,
    clientContact: data || null,
  };
}
