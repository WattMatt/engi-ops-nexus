import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface OpsInboxItem {
  id: string;
  title: string;
  description: string | null;
  status: string | null;
  source: string;
  priority: string | null;
  project_ref: string | null;
  due_date: string | null;
  assignee_ids: string[] | null;
  external_ref_id: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface ResolvedProfile {
  id: string;
  full_name: string | null;
  email: string;
  avatar_url: string | null;
}

export function useOpsInbox() {
  return useQuery({
    queryKey: ["ops-unified-inbox"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ops_unified_inbox")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      // Cast assignee_ids from Json to string[]
      return (data ?? []).map((item) => ({
        ...item,
        assignee_ids: Array.isArray(item.assignee_ids)
          ? (item.assignee_ids as string[])
          : null,
      })) as OpsInboxItem[];
    },
  });
}

/**
 * Resolve a set of user UUIDs to profile data (name, email, avatar).
 * Deduplicates across all inbox items.
 */
export function useResolvedAssignees(items: OpsInboxItem[]) {
  const allIds = Array.from(
    new Set(
      items.flatMap((i) => i.assignee_ids ?? []).filter(Boolean)
    )
  );

  return useQuery({
    queryKey: ["resolved-inbox-assignees", allIds.sort().join(",")],
    queryFn: async () => {
      if (allIds.length === 0) return {} as Record<string, ResolvedProfile>;
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, avatar_url")
        .in("id", allIds);
      if (error) throw error;
      const map: Record<string, ResolvedProfile> = {};
      (data ?? []).forEach((p) => {
        map[p.id] = p as ResolvedProfile;
      });
      return map;
    },
    enabled: allIds.length > 0,
  });
}
