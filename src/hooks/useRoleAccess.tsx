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

      // Fetch ALL role rows — users may hold multiple roles, and
      // .maybeSingle() errors when more than one row exists
      const { data: roleRows, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      if (error) {
        // Fail closed: a failed role lookup is treated as unauthorized
        console.error("Error fetching user roles:", error);
        setUserRole(null);
        if (requiredRole) {
          toast.error("You don't have permission to access this page");
          navigate("/");
        }
        return;
      }

      const roles = new Set((roleRows ?? []).map((r) => r.role as AppRole));
      // Derive the highest-privilege role; default to "user" when no rows exist
      const role: AppRole = roles.has("admin")
        ? "admin"
        : roles.has("moderator")
          ? "moderator"
          : "user";
      setUserRole(role);

      // Check access if required role is specified
      if (requiredRole && !hasAccess(role, requiredRole)) {
        toast.error("You don't have permission to access this page");
        navigate("/");
      }
    } catch (error) {
      // Fail closed on unexpected errors as well
      console.error("Error in checkUserRole:", error);
      if (requiredRole) {
        toast.error("You don't have permission to access this page");
        navigate("/");
      }
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
