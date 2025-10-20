import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  FileText, 
  DollarSign, 
  Package, 
  FileCheck, 
  Users, 
  Settings,
  LogOut,
  FolderOpen,
  Building2
} from "lucide-react";
import { toast } from "sonner";

interface Module {
  title: string;
  description: string;
  icon: any;
  path: string;
  adminOnly?: boolean;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [projectName, setProjectName] = useState<string>("");

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

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", session.user.id)
      .single();

    setUserRole(profile?.role || null);
  };

  const loadProjectInfo = async () => {
    const projectId = localStorage.getItem("selectedProjectId");
    if (!projectId) {
      navigate("/projects");
      return;
    }

    const { data: project } = await supabase
      .from("projects")
      .select("name")
      .eq("id", projectId)
      .single();

    setProjectName(project?.name || "");
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem("selectedProjectId");
    navigate("/auth");
  };

  const handleChangeProject = () => {
    localStorage.removeItem("selectedProjectId");
    navigate("/projects");
  };

  const modules: Module[] = [
    {
      title: "Site Diary",
      description: "Daily site progress, weather, and notes",
      icon: FileText,
      path: "/dashboard/site-diary",
    },
    {
      title: "Reports",
      description: "Bulk services, metering, generators",
      icon: FileCheck,
      path: "/dashboard/reports",
    },
    {
      title: "Budgeting",
      description: "Electrical and solar budgets",
      icon: DollarSign,
      path: "/dashboard/budgets",
      adminOnly: true,
    },
    {
      title: "Equipment Orders",
      description: "MV/LV equipment and lighting",
      icon: Package,
      path: "/dashboard/equipment",
    },
    {
      title: "User Management",
      description: "Manage team members and roles",
      icon: Users,
      path: "/dashboard/users",
      adminOnly: true,
    },
  ];

  const visibleModules = modules.filter(
    (module) => !module.adminOnly || userRole === "admin"
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-lg bg-primary/10">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">WM Consulting</h1>
                <p className="text-sm text-muted-foreground">Engineering Operations</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={handleChangeProject}>
                <FolderOpen className="h-4 w-4 mr-2" />
                Change Project
              </Button>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-foreground mb-2">{projectName}</h2>
          <p className="text-muted-foreground">
            Select a module to get started
            {userRole === "admin" && <span className="ml-2 text-accent font-medium">(Administrator)</span>}
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {visibleModules.map((module) => {
            const Icon = module.icon;
            return (
              <Card
                key={module.path}
                className="cursor-pointer hover:shadow-lg transition-all hover:border-primary group"
                onClick={() => navigate(module.path)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between mb-3">
                    <div className="p-3 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    {module.adminOnly && (
                      <span className="text-xs px-2 py-1 rounded-full bg-accent/20 text-accent font-medium">
                        Admin
                      </span>
                    )}
                  </div>
                  <CardTitle className="text-xl">{module.title}</CardTitle>
                  <CardDescription>{module.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="w-full" variant="outline">
                    Open Module
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;