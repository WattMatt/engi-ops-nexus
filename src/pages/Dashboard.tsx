import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  FileText, 
  DollarSign, 
  Cable, 
  FileCheck, 
  Users,
  Settings,
  TrendingUp,
  Activity,
  Calendar
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { TenantChangesWidget } from "@/components/dashboard/TenantChangesWidget";
import { BeneficialOccupationWidget } from "@/components/dashboard/BeneficialOccupationWidget";
import { BulkServicesWidget } from "@/components/dashboard/BulkServicesWidget";

const Dashboard = () => {
  const projectId = localStorage.getItem("selectedProjectId");
  const projectName = localStorage.getItem("currentProjectName");
  const navigate = useNavigate();

  const { data: costReports = [] } = useQuery({
    queryKey: ["cost-reports", projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from("cost_reports")
        .select("*")
        .eq("project_id", projectId);
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  const { data: budgets = [] } = useQuery({
    queryKey: ["budgets", projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from("electrical_budgets")
        .select("*")
        .eq("project_id", projectId);
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  const { data: cableSchedules = [] } = useQuery({
    queryKey: ["cable-schedules", projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from("cable_schedules")
        .select("*")
        .eq("project_id", projectId);
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  const totalDocuments = costReports.length + budgets.length;

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Project Overview</h1>
          <p className="text-muted-foreground mt-1">{projectName || "No project selected"}</p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate("/dashboard/cost-reports")}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cost Reports</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{costReports.length}</div>
            <p className="text-xs text-muted-foreground">Active reports</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate("/dashboard/budgets/electrical")}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Budgets</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{budgets.length}</div>
            <p className="text-xs text-muted-foreground">Electrical budgets</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate("/dashboard/cable-schedules")}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cable Schedules</CardTitle>
            <Cable className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{cableSchedules.length}</div>
            <p className="text-xs text-muted-foreground">Active schedules</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate("/dashboard/project-settings")}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Project Settings</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Configure</div>
            <p className="text-xs text-muted-foreground">Manage project</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Left column - Tenant Changes */}
        <div className="lg:col-span-1">
          <TenantChangesWidget />
        </div>

        {/* Middle column - Beneficial Occupation Deadlines */}
        {projectId && (
          <div className="lg:col-span-1">
            <BeneficialOccupationWidget projectId={projectId} />
          </div>
        )}

        {/* Bulk Services Status Widget */}
        {projectId && (
          <div className="lg:col-span-1">
            <BulkServicesWidget projectId={projectId} />
          </div>
        )}
      </div>

      {/* Secondary Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Right column with stacked cards */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Project Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Documentation</span>
                  <span className="font-medium">{totalDocuments} items</span>
                </div>
                <Progress value={totalDocuments > 0 ? 65 : 0} />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Technical Drawings</span>
                  <span className="font-medium">{cableSchedules.length} schedules</span>
                </div>
                <Progress value={cableSchedules.length > 0 ? 45 : 0} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2">
                <Button variant="outline" onClick={() => navigate("/dashboard/cost-reports")}>
                  <FileText className="h-4 w-4 mr-2" />
                  New Cost Report
                </Button>
                <Button variant="outline" onClick={() => navigate("/dashboard/budgets/electrical")}>
                  <DollarSign className="h-4 w-4 mr-2" />
                  New Budget
                </Button>
                <Button variant="outline" onClick={() => navigate("/dashboard/cable-schedules")}>
                  <Cable className="h-4 w-4 mr-2" />
                  New Cable Schedule
                </Button>
                <Button variant="outline" onClick={() => navigate("/dashboard/site-diary")}>
                  <Calendar className="h-4 w-4 mr-2" />
                  Site Diary
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Empty space columns for layout */}
        <div className="lg:col-span-2"></div>
      </div>
    </div>
  );
};

export default Dashboard;