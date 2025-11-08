import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

export const useFeedbackNotifications = () => {
  const { data: user } = useQuery({
    queryKey: ["user"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  const { data: unverifiedCount = 0, refetch } = useQuery({
    queryKey: ["feedback-notifications", user?.id],
    queryFn: async () => {
      if (!user) return 0;

      const [issuesResult, suggestionsResult] = await Promise.all([
        supabase
          .from("issue_reports")
          .select("id", { count: "exact", head: true })
          .eq("reported_by", user.id)
          .eq("needs_user_attention", true),
        supabase
          .from("suggestions")
          .select("id", { count: "exact", head: true })
          .eq("reported_by", user.id)
          .eq("needs_user_attention", true),
      ]);

      const issuesCount = issuesResult.count || 0;
      const suggestionsCount = suggestionsResult.count || 0;

      return issuesCount + suggestionsCount;
    },
    enabled: !!user,
  });

  // Subscribe to real-time updates
  useEffect(() => {
    if (!user) return;

    const issuesChannel = supabase
      .channel("issues-notifications")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "issue_reports",
          filter: `reported_by=eq.${user.id}`,
        },
        () => {
          refetch();
        }
      )
      .subscribe();

    const suggestionsChannel = supabase
      .channel("suggestions-notifications")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "suggestions",
          filter: `reported_by=eq.${user.id}`,
        },
        () => {
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(issuesChannel);
      supabase.removeChannel(suggestionsChannel);
    };
  }, [user, refetch]);

  return { unverifiedCount, refetch };
};
