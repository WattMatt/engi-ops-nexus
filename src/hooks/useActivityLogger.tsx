import { supabase } from "@/integrations/supabase/client";
import { useCallback } from "react";

export const useActivityLogger = () => {
  const logActivity = useCallback(async (
    actionType: string,
    actionDescription: string,
    metadata?: Record<string, any>,
    projectId?: string | null
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.rpc('log_user_activity', {
        p_user_id: user.id,
        p_action_type: actionType,
        p_action_description: actionDescription,
        p_metadata: metadata || {},
        p_project_id: projectId || null
      });
    } catch (error) {
      console.error("Failed to log activity:", error);
    }
  }, []);

  return { logActivity };
};
