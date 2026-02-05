import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface ClientContact {
  id: string;
  organization_name: string;
  contact_person_name: string | null;
  logo_url: string | null;
}

interface ProjectClientStatus {
  hasClient: boolean;
  isLoading: boolean;
  error: Error | null;
  clientContact: ClientContact | null;
}

const CACHE_KEY_PREFIX = 'project-client-cache-';

export function useProjectClientCheck(projectId: string | null): ProjectClientStatus {
  const { data, isLoading, error } = useQuery({
    queryKey: ["project-client-check", projectId],
    queryFn: async (): Promise<ClientContact | null> => {
      if (!projectId) return null;

      try {
        const { data, error } = await supabase
          .from("project_contacts")
          .select("id, organization_name, contact_person_name, logo_url")
          .eq("project_id", projectId)
          .eq("contact_type", "client")
          .limit(1)
          .maybeSingle();

        if (error) {
          // On network/query error, try localStorage cache
          const cached = localStorage.getItem(`${CACHE_KEY_PREFIX}${projectId}`);
          if (cached) {
            console.log('[ProjectClientCheck] Using cached client data due to error:', error.message);
            return JSON.parse(cached) as ClientContact;
          }
          throw error;
        }

        // Cache successful result to localStorage
        if (data) {
          localStorage.setItem(`${CACHE_KEY_PREFIX}${projectId}`, JSON.stringify(data));
        } else {
          // Clear cache if no client found (so we don't use stale data)
          localStorage.removeItem(`${CACHE_KEY_PREFIX}${projectId}`);
        }

        return data;
      } catch (err) {
        // Final fallback: check localStorage cache
        const cached = localStorage.getItem(`${CACHE_KEY_PREFIX}${projectId}`);
        if (cached) {
          console.log('[ProjectClientCheck] Using cached client data due to exception');
          return JSON.parse(cached) as ClientContact;
        }
        throw err;
      }
    },
    enabled: !!projectId,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
  });

  return {
    hasClient: !!data,
    isLoading,
    error: error as Error | null,
    clientContact: data || null,
  };
}
