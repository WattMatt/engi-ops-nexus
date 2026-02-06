import { useEffect, useState } from "react";
import { useNavigate, Outlet, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ProjectDropdown } from "@/components/ProjectDropdown";
import { MessageNotificationBell } from "@/components/messaging/MessageNotificationBell";
import { LogOut } from "lucide-react";
import { FirstLoginModal } from "@/components/auth/FirstLoginModal";
import { useQuery } from "@tanstack/react-query";
import { ProjectContextHeader } from "@/components/common/ProjectContextHeader";
import { useProjectClientCheck } from "@/hooks/useProjectClientCheck";
import { ProjectContactSetupBanner } from "@/components/project/ProjectContactSetupBanner";
import { useSessionMonitor } from "@/hooks/useSessionMonitor";

const DashboardLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [projectId, setProjectId] = useState<string | null>(null);
  const [projectName, setProjectName] = useState<string>("");
  const [projectNumber, setProjectNumber] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [mustChangePassword, setMustChangePassword] = useState(false);

  // Check if project has a client contact assigned
  const { hasClient, isLoading: isCheckingClient, error: clientCheckError } = useProjectClientCheck(projectId);

  // Session monitor for automatic logout
  useSessionMonitor();

  // Check user's profile for password change requirements
  const { data: profile, refetch: refetchProfile } = useQuery({
    queryKey: ['user-profile', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from('profiles')
        .select('first_login, must_change_password')
        .eq('id', user.id)
        .single();
      return data;
    },
    enabled: !!user,
  });

  useEffect(() => {
    checkAuth();
    loadProjectInfo();

    // Listen for project changes
    const handleProjectChange = () => {
      loadProjectInfo();
    };
    
    window.addEventListener('projectChanged', handleProjectChange);
    return () => window.removeEventListener('projectChanged', handleProjectChange);
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }
    setUser(session.user);
  };

  // Check if user must change password
  useEffect(() => {
    if (profile) {
      setMustChangePassword(profile.first_login || profile.must_change_password);
    }
  }, [profile]);

  const loadProjectInfo = async () => {
    const storedProjectId = localStorage.getItem("selectedProjectId");
    if (!storedProjectId) {
      navigate("/projects");
      return;
    }

    setProjectId(storedProjectId);

    const { data: project } = await supabase
      .from("projects")
      .select("name, project_number")
      .eq("id", storedProjectId)
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

  // Check if user is on allowed pages when no client is assigned
  const isOnContactLibrary = location.pathname.includes("contact-library");
  const isOnProjectSettings = location.pathname.includes("project-settings");
  const allowedWithoutClient = isOnContactLibrary || isOnProjectSettings;

  // Determine if we should block the content
  // ONLY block if query completed successfully AND confirmed no client exists
  // Do NOT block during loading, errors, or network issues
  const shouldBlockContent = !loading && !isCheckingClient && !clientCheckError && 
    projectId && !hasClient && !allowedWithoutClient;

  // Redirect to contact library if no client and trying to access other pages
  useEffect(() => {
    if (shouldBlockContent) {
      navigate("/dashboard/contact-library");
    }
  }, [shouldBlockContent, navigate]);

  // Show password change modal if required
  if (mustChangePassword) {
    return <FirstLoginModal onPasswordChanged={() => {
      setMustChangePassword(false);
      refetchProfile();
    }} />;
  }

  return (
    <SidebarProvider>
      <div className="h-screen flex w-full">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <header className="h-16 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 flex items-center justify-between px-6 shrink-0 z-50 shadow-sm">
            <div className="flex items-center gap-4">
              <SidebarTrigger />
            </div>
            
            <div className="flex items-center gap-3">
              <MessageNotificationBell />
              <ProjectDropdown />
              <Button variant="outline" size="sm" onClick={handleLogout} className="gap-2">
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </div>
          </header>

          {/* Project Context Header */}
          <ProjectContextHeader 
            projectName={projectName} 
            projectNumber={projectNumber} 
          />

          {/* Show warning banner if no client assigned */}
          {!hasClient && projectId && !isCheckingClient && (
            <ProjectContactSetupBanner projectName={projectName} />
          )}

          {/* Main Content */}
          <main className="flex-1 bg-gradient-to-b from-background to-muted/20 overflow-auto pb-8">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default DashboardLayout;
