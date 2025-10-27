import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Folder, LogOut, Users, Settings } from "lucide-react";
import { toast } from "sonner";
import { useUserRole } from "@/hooks/useUserRole";
import { CreateProjectDialog } from "@/components/CreateProjectDialog";

interface Project {
  id: string;
  project_number: string;
  name: string;
  description: string | null;
  status: string;
  consultant_logo_url: string | null;
  client_logo_url: string | null;
}

const ProjectSelect = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const { isAdmin, loading: roleLoading } = useUserRole();
  const isAdminRoute = location.pathname.startsWith('/admin');

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const { data, error } = await supabase
        .from("projects")
        .select("id, project_number, name, description, status, consultant_logo_url, client_logo_url")
        .order("project_number", { ascending: true });

      if (error) throw error;
      setProjects(data || []);
    } catch (error: any) {
      toast.error("Failed to load projects");
    } finally {
      setLoading(false);
    }
  };

  const handleProjectSelect = (projectId: string) => {
    localStorage.setItem("selectedProjectId", projectId);
    navigate("/dashboard");
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  if (loading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading projects...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              {isAdminRoute ? "Admin Portal" : "Select a Project"}
            </h1>
            <p className="text-muted-foreground">
              {isAdminRoute 
                ? "Manage organization-wide settings or select a project" 
                : "Choose a project to access its modules and data"}
            </p>
          </div>
          <div className="flex gap-3">
            {!isAdminRoute && (
              <Button variant="outline" onClick={() => navigate("/admin/projects")}>
                <Settings className="h-4 w-4 mr-2" />
                Admin Portal
              </Button>
            )}
            {isAdminRoute && (
              <>
                <Button variant="outline" onClick={() => navigate("/admin/staff")}>
                  <Users className="h-4 w-4 mr-2" />
                  Staff Management
                </Button>
                <Button variant="outline" onClick={() => navigate("/admin/users")}>
                  <Users className="h-4 w-4 mr-2" />
                  User Management
                </Button>
                <Button variant="outline" onClick={() => navigate("/admin/settings")}>
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </Button>
              </>
            )}
            {isAdmin && <CreateProjectDialog onProjectCreated={loadProjects} />}
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>

        {projects.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Folder className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Projects Yet</h3>
              <p className="text-muted-foreground mb-6">
                Contact your administrator to be added to a project
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <Card 
                key={project.id} 
                className="cursor-pointer hover:shadow-lg transition-all hover:border-primary"
                onClick={() => handleProjectSelect(project.id)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Folder className="h-6 w-6 text-primary" />
                    </div>
                    <span className="text-xs px-2 py-1 rounded-full bg-secondary text-secondary-foreground">
                      {project.status}
                    </span>
                  </div>
                  
                  {(project.consultant_logo_url || project.client_logo_url) && (
                    <div className="flex items-center gap-4 mt-4 pb-4 border-b">
                      {project.consultant_logo_url && (
                        <div className="flex-1">
                          <img 
                            src={project.consultant_logo_url} 
                            alt="Consultant Logo" 
                            className="h-12 w-auto object-contain"
                          />
                        </div>
                      )}
                      {project.client_logo_url && (
                        <div className="flex-1">
                          <img 
                            src={project.client_logo_url} 
                            alt="Client Logo" 
                            className="h-12 w-auto object-contain"
                          />
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div className="mt-4">
                    <div className="text-sm font-medium text-muted-foreground mb-1">
                      {project.project_number}
                    </div>
                    <CardTitle>{project.name}</CardTitle>
                  </div>
                  <CardDescription>
                    {project.description || "No description"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="w-full" variant="outline">
                    Open Project
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectSelect;