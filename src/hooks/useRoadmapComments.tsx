import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface RoadmapComment {
  id: string;
  roadmap_item_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export const useRoadmapComments = (itemId: string) => {
  const queryClient = useQueryClient();

  const { data: comments, isLoading } = useQuery({
    queryKey: ["roadmap-comments", itemId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("roadmap_item_comments")
        .select("*")
        .eq("roadmap_item_id", itemId)
        .order("created_at", { ascending: true });
      
      if (error) throw error;
      return data as RoadmapComment[];
    },
    enabled: !!itemId,
  });

  // Set up real-time subscription
  useEffect(() => {
    if (!itemId) return;

    const channel = supabase
      .channel(`roadmap-comments-${itemId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "roadmap_item_comments",
          filter: `roadmap_item_id=eq.${itemId}`,
        },
        () => {
          // Refetch comments when any change occurs
          queryClient.invalidateQueries({ queryKey: ["roadmap-comments", itemId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [itemId, queryClient]);

  return { comments, isLoading };
};
