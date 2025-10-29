import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export type AppRole = "admin" | "moderator" | "user";

export const useRoleAccess = (requiredRole?: AppRole) => {
  const [userRole, setUserRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    checkUserRole();
  }, []);

  const checkUserRole = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setLoading(false);
        return;
      }

      const { data: roleData, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Error fetching user role:", error);
        setLoading(false);
        return;
      }

      const role = roleData?.role as AppRole || "user";
      setUserRole(role);

      // Check access if required role is specified
      if (requiredRole && !hasAccess(role, requiredRole)) {
        toast.error("You don't have permission to access this page");
        navigate("/");
      }
    } catch (error) {
      console.error("Error in checkUserRole:", error);
    } finally {
      setLoading(false);
    }
  };

  const hasAccess = (userRole: AppRole, requiredRole: AppRole): boolean => {
    const roleHierarchy: Record<AppRole, number> = {
      admin: 3,
      moderator: 2,
      user: 1,
    };

    return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
  };

  const isAdmin = userRole === "admin";
  const isModerator = userRole === "moderator" || isAdmin;

  return {
    userRole,
    loading,
    isAdmin,
    isModerator,
    hasRole: (role: AppRole) => userRole === role,
    hasAccess: (role: AppRole) => userRole ? hasAccess(userRole, role) : false,
  };
};
