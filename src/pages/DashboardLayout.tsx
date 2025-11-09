import { useEffect, useState } from "react";
import { useNavigate, Outlet } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ProjectDropdown } from "@/components/ProjectDropdown";
import { MessageNotificationBell } from "@/components/messaging/MessageNotificationBell";
import { LogOut } from "lucide-react";
import { FirstLoginModal } from "@/components/auth/FirstLoginModal";
import { useQuery } from "@tanstack/react-query";

const DashboardLayout = () => {
  const navigate = useNavigate();
  const [projectName, setProjectName] = useState<string>("");
  const [projectNumber, setProjectNumber] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [mustChangePassword, setMustChangePassword] = useState(false);

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

  // Show password change modal if required
  if (mustChangePassword) {
    return <FirstLoginModal onPasswordChanged={() => {
      setMustChangePassword(false);
      refetchProfile();
    }} />;
  }

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
              <MessageNotificationBell />
              <ProjectDropdown />
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 p-6 bg-background overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default DashboardLayout;
