import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

export type ReportType = 'tenant_report' | 'generator_report' | 'cost_report' | 'project_documents';

interface ClientProjectAccess {
  id: string;
  project_id: string;
  project_name?: string;
  permissions: {
    report_type: ReportType;
    can_view: boolean;
    can_comment: boolean;
    can_approve: boolean;
  }[];
}

export const useClientAccess = () => {
  const [isClient, setIsClient] = useState(false);
  const [clientProjects, setClientProjects] = useState<ClientProjectAccess[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    checkClientAccess();
  }, []);

  const checkClientAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setLoading(false);
        return;
      }

      // Check if user has client role
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "client")
        .maybeSingle();

      if (roleData) {
        setIsClient(true);

        // Fetch client project access with permissions
        const { data: accessData } = await supabase
          .from("client_project_access")
          .select(`
            id,
            project_id,
            projects(name),
            client_report_permissions(
              report_type,
              can_view,
              can_comment,
              can_approve
            )
          `)
          .eq("user_id", user.id);

        if (accessData) {
          const formattedAccess = accessData.map((access: any) => ({
            id: access.id,
            project_id: access.project_id,
            project_name: access.projects?.name,
            permissions: access.client_report_permissions || []
          }));
          setClientProjects(formattedAccess);
        }
      }
    } catch (error) {
      console.error("Error checking client access:", error);
    } finally {
      setLoading(false);
    }
  };

  const hasReportAccess = (projectId: string, reportType: ReportType, permission: 'view' | 'comment' | 'approve') => {
    const project = clientProjects.find(p => p.project_id === projectId);
    if (!project) return false;

    const reportPermission = project.permissions.find(p => p.report_type === reportType);
    if (!reportPermission) return false;

    switch (permission) {
      case 'view': return reportPermission.can_view;
      case 'comment': return reportPermission.can_comment;
      case 'approve': return reportPermission.can_approve;
      default: return false;
    }
  };

  return {
    isClient,
    clientProjects,
    loading,
    hasReportAccess,
    refetch: checkClientAccess
  };
};
