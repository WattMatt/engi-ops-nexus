import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useClientAccess } from "@/hooks/useClientAccess";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  FileText, 
  Zap, 
  DollarSign, 
  FolderOpen, 
  Eye,
  MessageSquare,
  CheckCircle,
  Building2
} from "lucide-react";
import { toast } from "sonner";
import { PortalHeader } from "@/components/portal/PortalHeader";
import { useQuery } from "@tanstack/react-query";

interface ProjectBranding {
  project_logo_url: string | null;
  client_logo_url: string | null;
  consultant_logo_url: string | null;
}

const ClientPortal = () => {
  const navigate = useNavigate();
  const { isClient, clientProjects, loading } = useClientAccess();
  const [selectedProject, setSelectedProject] = useState<string | null>(null);

  // Fetch branding for all projects the client has access to
  const { data: projectBranding = {} } = useQuery({
    queryKey: ['client-project-branding', clientProjects.map(p => p.project_id)],
    queryFn: async () => {
      const projectIds = clientProjects.map(p => p.project_id);
      const { data, error } = await supabase
        .from('projects')
        .select('id, project_logo_url, client_logo_url, consultant_logo_url')
        .in('id', projectIds);
      
      if (error) throw error;
      
      const brandingMap: Record<string, ProjectBranding> = {};
      data?.forEach(p => {
        brandingMap[p.id] = {
          project_logo_url: p.project_logo_url,
          client_logo_url: p.client_logo_url,
          consultant_logo_url: p.consultant_logo_url
        };
      });
      return brandingMap;
    },
    enabled: clientProjects.length > 0
  });

  useEffect(() => {
    if (!loading && !isClient) {
      toast.error("Access denied. Client portal is for authorized clients only.");
      navigate("/");
    }
  }, [loading, isClient, navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  // Get current project branding
  const currentProjectId = selectedProject || clientProjects[0]?.project_id;
  const currentProject = clientProjects.find(p => p.project_id === currentProjectId);
  const currentBranding = currentProjectId ? projectBranding[currentProjectId] : null;

  const getReportIcon = (reportType: string) => {
    switch (reportType) {
      case 'tenant_report': return <FileText className="h-5 w-5" />;
      case 'generator_report': return <Zap className="h-5 w-5" />;
      case 'cost_report': return <DollarSign className="h-5 w-5" />;
      case 'project_documents': return <FolderOpen className="h-5 w-5" />;
      default: return <FileText className="h-5 w-5" />;
    }
  };

  const getReportLabel = (reportType: string) => {
    switch (reportType) {
      case 'tenant_report': return 'Tenant Report';
      case 'generator_report': return 'Generator Report';
      case 'cost_report': return 'Cost Report';
      case 'project_documents': return 'Project Documents';
      default: return reportType;
    }
  };

  const navigateToReport = (projectId: string, reportType: string) => {
    switch (reportType) {
      case 'tenant_report':
        navigate(`/client/tenant-report/${projectId}`);
        break;
      case 'generator_report':
        navigate(`/client/generator-report/${projectId}`);
        break;
      case 'cost_report':
        navigate(`/client/cost-report/${projectId}`);
        break;
      case 'project_documents':
        navigate(`/client/documents/${projectId}`);
        break;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <PortalHeader
        projectName={currentProject?.project_name || "Client Portal"}
        projectLogoUrl={currentBranding?.project_logo_url}
        clientLogoUrl={currentBranding?.client_logo_url}
        consultantLogoUrl={currentBranding?.consultant_logo_url}
        portalType="client"
        subtitle="View and review project reports"
        onLogout={handleLogout}
        showLogout={true}
      />

      {/* Main content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {clientProjects.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-lg font-medium mb-2">No Projects Assigned</h2>
              <p className="text-muted-foreground">
                You don't have access to any projects yet. Please contact your project manager.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Tabs 
            defaultValue={clientProjects[0]?.project_id} 
            onValueChange={setSelectedProject}
            className="space-y-6"
          >
            <TabsList className="flex-wrap h-auto gap-2 p-2">
              {clientProjects.map((project) => (
                <TabsTrigger 
                  key={project.project_id} 
                  value={project.project_id}
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  <Building2 className="h-4 w-4 mr-2" />
                  {project.project_name || "Project"}
                </TabsTrigger>
              ))}
            </TabsList>

            {clientProjects.map((project) => (
              <TabsContent key={project.project_id} value={project.project_id}>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  {project.permissions.filter(p => p.can_view).map((permission) => (
                    <Card 
                      key={permission.report_type}
                      className="cursor-pointer hover:border-primary transition-colors"
                      onClick={() => navigateToReport(project.project_id, permission.report_type)}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          {getReportIcon(permission.report_type)}
                          <div className="flex gap-1">
                            {permission.can_view && (
                              <Badge variant="outline" className="text-xs">
                                <Eye className="h-3 w-3 mr-1" />
                                View
                              </Badge>
                            )}
                          </div>
                        </div>
                        <CardTitle className="text-base">
                          {getReportLabel(permission.report_type)}
                        </CardTitle>
                        <CardDescription className="text-xs">
                          Click to view report
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="flex gap-2">
                          {permission.can_comment && (
                            <Badge variant="secondary" className="text-xs">
                              <MessageSquare className="h-3 w-3 mr-1" />
                              Comment
                            </Badge>
                          )}
                          {permission.can_approve && (
                            <Badge variant="secondary" className="text-xs">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Sign-off
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        )}
      </main>
    </div>
  );
};

export default ClientPortal;
