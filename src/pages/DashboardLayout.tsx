import { useEffect, useState } from "react";
import { useNavigate, Outlet, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ProjectDropdown } from "@/components/ProjectDropdown";
import { LogOut } from "lucide-react";

const DashboardLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [projectName, setProjectName] = useState<string>("");
  const [projectNumber, setProjectNumber] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
    loadProjectInfo();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }
  };

  const loadProjectInfo = async () => {
    const projectId = localStorage.getItem("selectedProjectId");
    if (!projectId) {
      navigate("/projects");
      return;
    }

    const { data: project } = await supabase
      .from("projects")
      .select("name, project_number")
      .eq("id", projectId)
      .maybeSingle();

    if (project) {
      setProjectName(project.name || "");
      setProjectNumber(project.project_number || "");
    }
    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem("selectedProjectId");
    navigate("/auth");
  };

  const isDashboardHome = location.pathname === "/dashboard";

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <header className="h-14 border-b bg-card flex items-center justify-between px-6 sticky top-0 z-10">
            <div className="flex items-center gap-4">
              <SidebarTrigger />
            </div>
            
            <div className="flex items-center gap-3">
              <ProjectDropdown />
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 p-6 bg-background overflow-auto">
            {isDashboardHome ? (
              <div>
                <div className="mb-8">
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    {projectNumber}
                  </div>
                  <h2 className="text-3xl font-bold text-foreground mb-2">{projectName}</h2>
                  <p className="text-muted-foreground">
                    Welcome to your project dashboard. Use the sidebar to navigate between modules.
                  </p>
                </div>
              </div>
            ) : (
              <Outlet />
            )}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default DashboardLayout;
